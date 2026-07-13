"""Monitoring agent (plan §9).

One tick = one simulated day. Each tick: settle due payouts, auto-apply
repayments, keep simulating future settlements for active contracts, re-check
risk signals, raise alerts. Idempotent via status transitions + an asyncio
lock shared by the scheduler and the manual /admin/monitor/tick trigger.
"""

import asyncio
import hashlib
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import (
    AlertSeverity,
    AlertType,
    AuditAction,
    ContractStatus,
    ScheduleItemStatus,
    SettlementStatus,
)
from app.domain.models import (
    Merchant,
    MurabahaContract,
    RepaymentScheduleItem,
    RiskAlert,
    SalesOrderRow,
    SettlementRow,
    SystemState,
)
from app.schemas.financing import TickResponse
from app.seed.synthetic import profile_for
from app.services import audit
from app.services.repayment import receive_settlement

_tick_lock = asyncio.Lock()

_SIM_KEY = "sim_day_offset"


async def get_sim_date(session: AsyncSession) -> date:
    state = await session.get(SystemState, _SIM_KEY)
    offset = int(state.value) if state else 0
    return date.today() + timedelta(days=offset)


async def _advance_sim_date(session: AsyncSession) -> date:
    state = await session.get(SystemState, _SIM_KEY)
    if state is None:
        state = SystemState(key=_SIM_KEY, value="0")
        session.add(state)
    state.value = str(int(state.value) + 1)
    return date.today() + timedelta(days=int(state.value))


def _should_delay(settlement: SettlementRow) -> bool:
    """Deterministic: risky merchants get ~1/3 of settlements delayed once."""
    if settlement.delayed:
        return False
    if not profile_for(settlement.merchant_id).risky:
        return False
    h = int(hashlib.sha256(settlement.external_id.encode()).hexdigest()[:8], 16)
    return h % 3 == 0


async def _raise_alert_once(
    session: AsyncSession, merchant_id: str, alert_type: AlertType,
    severity: AlertSeverity, message: str, contract_id: str | None = None,
) -> bool:
    existing = await session.scalar(
        select(RiskAlert).where(
            RiskAlert.merchant_id == merchant_id,
            RiskAlert.type == alert_type.value,
            RiskAlert.resolved.is_(False),
        )
    )
    if existing:
        return False
    session.add(
        RiskAlert(
            merchant_id=merchant_id,
            contract_id=contract_id,
            type=alert_type.value,
            severity=severity.value,
            message=message,
        )
    )
    return True


async def _simulate_next_settlement(
    session: AsyncSession, contract: MurabahaContract, sim_today: date
) -> None:
    """Keep receivables flowing for active contracts.

    If no settlement is due within the next few simulated days, synthesize the
    next payout so demo repayments progress steadily (plan §9: the agent
    simulates settlements).
    """
    near_term = await session.scalar(
        select(func.count()).select_from(SettlementRow).where(
            SettlementRow.merchant_id == contract.merchant_id,
            SettlementRow.status == SettlementStatus.PENDING.value,
            SettlementRow.expected_date <= sim_today + timedelta(days=4),
        )
    )
    if near_term:
        return
    profile = profile_for(contract.merchant_id)
    recent = (
        (
            await session.execute(
                select(SettlementRow.amount)
                .where(
                    SettlementRow.merchant_id == contract.merchant_id,
                    SettlementRow.status == SettlementStatus.RECEIVED.value,
                )
                .order_by(SettlementRow.expected_date.desc())
                .limit(3)
            )
        )
        .scalars()
        .all()
    )
    amount = sum(recent) / len(recent) if recent else profile.base_daily * 7 * 0.95
    if profile.risky:
        amount *= 0.4  # collapsed revenue keeps settlements small
    session.add(
        SettlementRow(
            merchant_id=contract.merchant_id,
            external_id=f"sim-stl-{contract.merchant_id[:8]}-{sim_today.isoformat()}",
            platform=profile.platforms[0],
            amount=round(amount, 2),
            expected_date=sim_today + timedelta(days=3),
            status=SettlementStatus.PENDING.value,
        )
    )


async def _check_revenue_drop(session: AsyncSession, merchant_id: str) -> bool:
    last_day = await session.scalar(
        select(func.max(SalesOrderRow.order_date)).where(
            SalesOrderRow.merchant_id == merchant_id
        )
    )
    if not last_day:
        return False

    async def window_sum(start: date, end: date) -> float:
        value = await session.scalar(
            select(func.coalesce(func.sum(SalesOrderRow.amount), 0.0)).where(
                SalesOrderRow.merchant_id == merchant_id,
                SalesOrderRow.status == "completed",
                SalesOrderRow.order_date > start,
                SalesOrderRow.order_date <= end,
            )
        )
        return float(value)

    recent = await window_sum(last_day - timedelta(days=14), last_day)
    baseline = await window_sum(last_day - timedelta(days=28), last_day - timedelta(days=14))
    if baseline > 0 and recent / baseline < 0.6:
        drop_pct = round((1 - recent / baseline) * 100)
        return await _raise_alert_once(
            session, merchant_id, AlertType.REVENUE_DROP, AlertSeverity.HIGH,
            f"Revenue down {drop_pct}% vs prior 14-day baseline.",
        )
    return False


async def run_tick(session: AsyncSession, actor_user_id: str | None = None) -> TickResponse:
    async with _tick_lock:
        sim_today = await _advance_sim_date(session)
        received = delayed = repayments = alerts = 0

        # 1) settle due payouts (or delay them for risky merchants)
        due = (
            (
                await session.execute(
                    select(SettlementRow).where(
                        SettlementRow.status == SettlementStatus.PENDING.value,
                        SettlementRow.expected_date <= sim_today,
                    )
                )
            )
            .scalars()
            .all()
        )
        for stl in due:
            if _should_delay(stl):
                stl.delayed = True
                stl.expected_date = stl.expected_date + timedelta(days=7)
                delayed += 1
                if await _raise_alert_once(
                    session, stl.merchant_id, AlertType.SETTLEMENT_DELAY,
                    AlertSeverity.MEDIUM,
                    f"{stl.platform} settlement of {stl.amount:,.0f} SAR delayed 7 days.",
                ):
                    alerts += 1
            else:
                applied = await receive_settlement(session, stl, received_on=sim_today)
                received += 1
                repayments += len(applied)

        # 2) risk re-check across every merchant with aggregated sales
        merchant_ids = (
            (await session.execute(select(SalesOrderRow.merchant_id).distinct()))
            .scalars()
            .all()
        )
        for merchant_id in merchant_ids:
            if await _check_revenue_drop(session, merchant_id):
                alerts += 1

        # 3) per active contract: keep settlements flowing + repayment watch
        contracts = (
            (
                await session.execute(
                    select(MurabahaContract).where(
                        MurabahaContract.status == ContractStatus.ACTIVE.value
                    )
                )
            )
            .scalars()
            .all()
        )
        for contract in contracts:
            await _simulate_next_settlement(session, contract, sim_today)

            overdue = await session.scalar(
                select(func.count()).select_from(RepaymentScheduleItem).where(
                    RepaymentScheduleItem.contract_id == contract.id,
                    RepaymentScheduleItem.status.in_(
                        [ScheduleItemStatus.PENDING.value, ScheduleItemStatus.PARTIAL.value]
                    ),
                    RepaymentScheduleItem.due_date < sim_today - timedelta(days=5),
                )
            )
            if overdue and await _raise_alert_once(
                session, contract.merchant_id, AlertType.MISSED_REPAYMENT,
                AlertSeverity.HIGH,
                f"{overdue} repayment installment(s) overdue more than 5 days.",
                contract_id=contract.id,
            ):
                alerts += 1

        closed = sum(1 for c in contracts if c.status == ContractStatus.REPAID.value)

        audit.record(
            session, AuditAction.MONITOR_TICK, "system", None,
            actor_user_id=actor_user_id,
            details={"sim_date": sim_today.isoformat(), "received": received,
                     "delayed": delayed, "repayments": repayments, "alerts": alerts},
        )
        await session.commit()
        return TickResponse(
            sim_date=sim_today,
            settlements_received=received,
            settlements_delayed=delayed,
            repayments_applied=repayments,
            contracts_closed=closed,
            alerts_raised=alerts,
        )


async def merchant_alerts(session: AsyncSession, merchant: Merchant) -> list[RiskAlert]:
    return list(
        (
            await session.execute(
                select(RiskAlert)
                .where(RiskAlert.merchant_id == merchant.id)
                .order_by(RiskAlert.created_at.desc())
            )
        ).scalars()
    )
