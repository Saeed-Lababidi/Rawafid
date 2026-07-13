"""Murabaha contract lifecycle (plan §11).

Structure, not a loan: the bank buys the receivable-backed asset at cost_price
and sells it to the merchant at sale_price = cost + disclosed profit. There is
no interest field anywhere; revenue = platform fee + success fee + Murabaha
profit, all explicit line items. Real deployment requires Sharia committee
sign-off on the contract template (flagged in README).
"""

from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import AuditAction, ScheduleItemStatus, SettlementStatus
from app.domain.models import (
    FinancingOffer,
    Merchant,
    MurabahaContract,
    RepaymentScheduleItem,
    SettlementRow,
)
from app.services import audit


async def create_contract(
    session: AsyncSession,
    merchant: Merchant,
    offer: FinancingOffer,
    actor_user_id: str | None = None,
) -> MurabahaContract:
    fees_total = round(offer.platform_fee + offer.success_fee, 2)
    contract = MurabahaContract(
        merchant_id=merchant.id,
        offer_id=offer.id,
        cost_price=offer.principal,
        profit_amount=offer.profit_amount,
        sale_price=round(offer.principal + offer.profit_amount, 2),
        fees_total=fees_total,
        total_due=offer.total_repayable,
        outstanding=offer.total_repayable,
    )
    session.add(contract)
    await session.flush()

    await _build_schedule(session, contract)

    # disbursement is modeled as state + audit record (no real money movement)
    audit.record(
        session, AuditAction.DISBURSE, "murabaha_contract", contract.id,
        actor_user_id=actor_user_id, merchant_id=merchant.id,
        details={"cost_price": contract.cost_price, "sale_price": contract.sale_price,
                 "profit_disclosed": contract.profit_amount, "fees": fees_total},
    )
    return contract


async def _build_schedule(session: AsyncSession, contract: MurabahaContract) -> None:
    """Map repayment installments onto upcoming pending settlements.

    Each installment deducts from one settlement payout. If pending
    settlements don't cover the total, a balloon installment lands one cycle
    after the last known settlement (the monitoring agent keeps simulating
    settlements, so it gets collected in the demo).
    """
    pending = (
        (
            await session.execute(
                select(SettlementRow)
                .where(
                    SettlementRow.merchant_id == contract.merchant_id,
                    SettlementRow.status == SettlementStatus.PENDING.value,
                )
                .order_by(SettlementRow.expected_date)
            )
        )
        .scalars()
        .all()
    )

    remaining = contract.total_due
    seq = 1
    last_date = date.today()
    for stl in pending:
        if remaining <= 0:
            break
        amount = round(min(remaining, stl.amount), 2)
        session.add(
            RepaymentScheduleItem(
                contract_id=contract.id,
                seq=seq,
                due_date=stl.expected_date,
                amount=amount,
                settlement_id=stl.id,
                status=ScheduleItemStatus.PENDING.value,
            )
        )
        remaining = round(remaining - amount, 2)
        last_date = stl.expected_date
        seq += 1

    if remaining > 0:
        session.add(
            RepaymentScheduleItem(
                contract_id=contract.id,
                seq=seq,
                due_date=last_date + timedelta(days=14),
                amount=remaining,
                settlement_id=None,  # collected from future simulated settlements
                status=ScheduleItemStatus.PENDING.value,
            )
        )
    await session.flush()
