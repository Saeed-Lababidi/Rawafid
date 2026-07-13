"""Auto-collection: apply a received settlement against repayment schedules."""

from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import (
    AuditAction,
    ContractStatus,
    ScheduleItemStatus,
    SettlementStatus,
)
from app.domain.models import (
    MurabahaContract,
    Repayment,
    RepaymentScheduleItem,
    SettlementRow,
)
from app.services import audit


class RepaymentError(Exception):
    pass


async def receive_settlement(
    session: AsyncSession,
    settlement: SettlementRow,
    received_on: date | None = None,
    actor_user_id: str | None = None,
) -> list[Repayment]:
    """Mark a settlement received and auto-deduct due repayments from it.

    Idempotent: guarded by the pending -> received status transition, so a
    scheduler tick and a manual trigger can't double-apply.
    """
    if settlement.status == SettlementStatus.RECEIVED.value:
        return []
    settlement.status = SettlementStatus.RECEIVED.value
    settlement.received_date = received_on or date.today()

    contracts = (
        (
            await session.execute(
                select(MurabahaContract).where(
                    MurabahaContract.merchant_id == settlement.merchant_id,
                    MurabahaContract.status == ContractStatus.ACTIVE.value,
                )
            )
        )
        .scalars()
        .all()
    )
    if not contracts:
        return []

    available = settlement.amount
    applied: list[Repayment] = []

    for contract in contracts:
        if available <= 0:
            break
        items = (
            (
                await session.execute(
                    select(RepaymentScheduleItem)
                    .where(
                        RepaymentScheduleItem.contract_id == contract.id,
                        RepaymentScheduleItem.status.in_(
                            [ScheduleItemStatus.PENDING.value, ScheduleItemStatus.PARTIAL.value]
                        ),
                    )
                    .order_by(RepaymentScheduleItem.seq)
                )
            )
            .scalars()
            .all()
        )
        # prefer the installment mapped to this settlement, then earliest open
        items.sort(key=lambda i: (i.settlement_id != settlement.id, i.seq))

        for item in items:
            if available <= 0:
                break
            due = round(item.amount - item.paid_amount, 2)
            if due <= 0:
                continue
            pay = round(min(due, available, contract.outstanding), 2)
            if pay <= 0:
                continue
            item.paid_amount = round(item.paid_amount + pay, 2)
            item.status = (
                ScheduleItemStatus.PAID.value
                if item.paid_amount >= item.amount - 0.005
                else ScheduleItemStatus.PARTIAL.value
            )
            contract.outstanding = round(contract.outstanding - pay, 2)
            available = round(available - pay, 2)

            repayment = Repayment(
                contract_id=contract.id,
                schedule_item_id=item.id,
                settlement_id=settlement.id,
                amount=pay,
            )
            session.add(repayment)
            applied.append(repayment)
            audit.record(
                session, AuditAction.REPAYMENT, "repayment", None,
                actor_user_id=actor_user_id, merchant_id=settlement.merchant_id,
                details={"contract_id": contract.id, "amount": pay,
                         "settlement_id": settlement.id,
                         "outstanding_after": contract.outstanding},
            )

        if contract.outstanding <= 0.005:
            contract.status = ContractStatus.REPAID.value
            contract.outstanding = 0.0
            audit.record(
                session, AuditAction.CONTRACT_CLOSED, "murabaha_contract", contract.id,
                merchant_id=settlement.merchant_id,
            )

    await session.flush()
    return applied
