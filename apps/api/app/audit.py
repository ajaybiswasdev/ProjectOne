"""Audit trail helpers. Failures never break the main request."""

import logging

from sqlalchemy.orm import Session

from app.models import AuditLog, User

logger = logging.getLogger(__name__)


def audit(
    db: Session,
    *,
    org_id: int,
    user: User | None = None,
    action: str,
    resource: str = "",
    detail: str = "",
    commit: bool = False,
) -> None:
    try:
        db.add(
            AuditLog(
                org_id=org_id,
                user_id=user.id if user else None,
                username=user.username if user else "",
                action=action,
                resource=resource,
                detail=detail,
            )
        )
        if commit:
            db.commit()
    except Exception:
        logger.exception("Audit write failed (action=%s)", action)
        if commit:
            db.rollback()
