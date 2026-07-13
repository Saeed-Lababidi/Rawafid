from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import AuditAction
from app.domain.models import AuditLog


def record(
    session: AsyncSession,
    action: AuditAction,
    entity_type: str,
    entity_id: str | None = None,
    *,
    actor_user_id: str | None = None,
    merchant_id: str | None = None,
    details: dict | None = None,
) -> None:
    """Stage an audit entry; committed with the caller's transaction."""
    session.add(
        AuditLog(
            actor_user_id=actor_user_id,
            merchant_id=merchant_id,
            action=action.value,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
        )
    )
