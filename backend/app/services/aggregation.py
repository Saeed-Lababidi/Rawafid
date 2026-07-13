"""Pull 90 days of data from connected providers and persist it (plan §8B)."""

from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.domain.enums import AuditAction, ConnectionStatus, ConnectionType
from app.domain.models import (
    BankAccountRow,
    Connection,
    Merchant,
    SalesOrderRow,
    SettlementRow,
    TransactionRow,
)
from app.providers.factory import get_bank_provider, get_sales_provider
from app.schemas.financing import AggregateResponse
from app.security.crypto import decrypt_token
from app.services import audit


async def _existing_ids(session: AsyncSession, model, merchant_id: str) -> set[str]:
    rows = await session.execute(
        select(model.external_id).where(model.merchant_id == merchant_id)
    )
    return {r[0] for r in rows}


async def aggregate_merchant(
    session: AsyncSession, merchant: Merchant, actor_user_id: str | None = None
) -> AggregateResponse:
    settings = get_settings()
    today = date.today()
    since = today - timedelta(days=settings.scoring_window_days)

    connections = (
        (
            await session.execute(
                select(Connection).where(
                    Connection.merchant_id == merchant.id,
                    Connection.status == ConnectionStatus.ACTIVE.value,
                )
            )
        )
        .scalars()
        .all()
    )

    counts = {"accounts": 0, "transactions": 0, "sales_orders": 0, "settlements": 0}

    for conn in connections:
        if not conn.token_encrypted:
            continue
        token = decrypt_token(conn.token_encrypted)

        if conn.type == ConnectionType.BANK.value:
            provider = get_bank_provider()
            seen_acc = await _existing_ids(session, BankAccountRow, merchant.id)
            for acc in await provider.list_accounts(token):
                if acc.external_id in seen_acc:
                    continue
                session.add(
                    BankAccountRow(
                        merchant_id=merchant.id,
                        connection_id=conn.id,
                        **acc.model_dump(),
                    )
                )
                counts["accounts"] += 1
            seen_txn = await _existing_ids(session, TransactionRow, merchant.id)
            for txn in await provider.get_transactions(token, since, today):
                if txn.external_id in seen_txn:
                    continue
                session.add(TransactionRow(merchant_id=merchant.id, **txn.model_dump()))
                counts["transactions"] += 1

        else:  # sales platform
            provider = get_sales_provider()
            seen_ord = await _existing_ids(session, SalesOrderRow, merchant.id)
            for order in await provider.get_sales(token, since, today):
                if order.external_id in seen_ord:
                    continue
                session.add(SalesOrderRow(merchant_id=merchant.id, **order.model_dump()))
                counts["sales_orders"] += 1
            seen_stl = await _existing_ids(session, SettlementRow, merchant.id)
            for stl in await provider.get_pending_settlements(token):
                if stl.external_id in seen_stl:
                    continue
                session.add(SettlementRow(merchant_id=merchant.id, **stl.model_dump()))
                counts["settlements"] += 1

    held = await held_receivables(session, merchant.id)
    audit.record(
        session, AuditAction.AGGREGATE, "merchant", merchant.id,
        actor_user_id=actor_user_id, merchant_id=merchant.id,
        details={**counts, "held_receivables_total": held},
    )
    await session.commit()
    return AggregateResponse(**counts, held_receivables_total=held)


async def held_receivables(session: AsyncSession, merchant_id: str) -> float:
    rows = (
        await session.execute(
            select(SettlementRow.amount).where(
                SettlementRow.merchant_id == merchant_id,
                SettlementRow.status == "pending",
            )
        )
    ).all()
    return round(sum(r[0] for r in rows), 2)
