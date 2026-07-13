from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentMerchant, SessionDep
from app.domain.models import MurabahaContract, Repayment
from app.schemas.financing import ContractDetailOut, ContractOut, RepaymentOut

router = APIRouter(prefix="/contracts", tags=["contracts"])


@router.get("/me", response_model=list[ContractOut])
async def my_contracts(merchant: CurrentMerchant, session: SessionDep):
    rows = await session.execute(
        select(MurabahaContract)
        .where(MurabahaContract.merchant_id == merchant.id)
        .order_by(MurabahaContract.created_at.desc())
    )
    return list(rows.scalars())


async def _get_contract(
    contract_id: str, merchant, session, *, with_schedule: bool = False
) -> MurabahaContract:
    query = select(MurabahaContract).where(MurabahaContract.id == contract_id)
    if with_schedule:
        query = query.options(selectinload(MurabahaContract.schedule))
    contract = await session.scalar(query)
    if not contract or contract.merchant_id != merchant.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "contract not found")
    return contract


@router.get("/{contract_id}", response_model=ContractDetailOut)
async def get_contract(contract_id: str, merchant: CurrentMerchant, session: SessionDep):
    contract = await _get_contract(contract_id, merchant, session, with_schedule=True)
    contract.schedule.sort(key=lambda i: i.seq)
    return contract


@router.get("/{contract_id}/repayments", response_model=list[RepaymentOut])
async def contract_repayments(
    contract_id: str, merchant: CurrentMerchant, session: SessionDep
):
    await _get_contract(contract_id, merchant, session)
    rows = await session.execute(
        select(Repayment)
        .where(Repayment.contract_id == contract_id)
        .order_by(Repayment.applied_at)
    )
    return list(rows.scalars())
