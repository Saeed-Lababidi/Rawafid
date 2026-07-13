from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentMerchant, CurrentUser, SessionDep
from app.domain.models import BankAccountRow, SalesOrderRow, SettlementRow, TransactionRow
from app.schemas.common import BankAccountOut, SalesOrderOut, SettlementOut, TransactionOut
from app.services import monitoring
from app.services.repayment import receive_settlement

router = APIRouter(tags=["data"])


@router.get("/accounts", response_model=list[BankAccountOut])
async def list_accounts(merchant: CurrentMerchant, session: SessionDep):
    rows = await session.execute(
        select(BankAccountRow).where(BankAccountRow.merchant_id == merchant.id)
    )
    return list(rows.scalars())


@router.get("/transactions", response_model=list[TransactionOut])
async def list_transactions(
    merchant: CurrentMerchant, session: SessionDep, limit: int = 500
):
    rows = await session.execute(
        select(TransactionRow)
        .where(TransactionRow.merchant_id == merchant.id)
        .order_by(TransactionRow.date.desc())
        .limit(min(limit, 2000))
    )
    return list(rows.scalars())


@router.get("/sales", response_model=list[SalesOrderOut])
async def list_sales(merchant: CurrentMerchant, session: SessionDep, limit: int = 500):
    rows = await session.execute(
        select(SalesOrderRow)
        .where(SalesOrderRow.merchant_id == merchant.id)
        .order_by(SalesOrderRow.order_date.desc())
        .limit(min(limit, 5000))
    )
    return list(rows.scalars())


@router.get("/settlements", response_model=list[SettlementOut])
async def list_settlements(merchant: CurrentMerchant, session: SessionDep):
    rows = await session.execute(
        select(SettlementRow)
        .where(SettlementRow.merchant_id == merchant.id)
        .order_by(SettlementRow.expected_date)
    )
    return list(rows.scalars())


@router.post("/settlements/{settlement_id}/receive", response_model=SettlementOut)
async def receive(
    settlement_id: str, merchant: CurrentMerchant, session: SessionDep, user: CurrentUser
):
    """Manual demo trigger: force a settlement to arrive now (plan §9)."""
    settlement = await session.get(SettlementRow, settlement_id)
    if not settlement or settlement.merchant_id != merchant.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "settlement not found")
    if settlement.status == "received":
        raise HTTPException(status.HTTP_409_CONFLICT, "settlement already received")
    sim_today = await monitoring.get_sim_date(session)
    await receive_settlement(session, settlement, received_on=sim_today, actor_user_id=user.id)
    await session.commit()
    return settlement
