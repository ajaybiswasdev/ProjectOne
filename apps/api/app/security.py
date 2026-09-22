"""Token and API-key helpers (no external services required)."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

RESET_TOKEN_TTL_HOURS = 24
INVITE_TOKEN_TTL_HOURS = 24 * 7


def new_token() -> str:
    return secrets.token_urlsafe(32)


def new_api_key() -> tuple[str, str, str]:
    """Return (full_key, prefix, sha256_hash). Full key is shown once."""
    prefix = f"bk_{secrets.token_hex(4)}"
    secret = secrets.token_hex(24)
    full_key = f"{prefix}_{secret}"
    return full_key, prefix, hash_api_key(full_key)


def hash_api_key(full_key: str) -> str:
    return hashlib.sha256(full_key.encode("utf-8")).hexdigest()


def token_expiry(hours: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()


def token_is_expired(expires_at: str) -> bool:
    try:
        exp = datetime.fromisoformat(expires_at)
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        return exp < datetime.now(timezone.utc)
    except ValueError:
        return True
