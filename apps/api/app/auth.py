from collections.abc import Callable
from datetime import datetime, timedelta, timezone

from fastapi import Depends, Header, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import ApiKey, User
from app.rbac import Permission, has_permission
from app.security import hash_api_key

settings = get_settings()
SECRET_KEY = settings.secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def _user_from_api_key(api_key: str, db: Session) -> User | None:
    key_hash = hash_api_key(api_key)
    row = db.query(ApiKey).filter(ApiKey.key_hash == key_hash, ApiKey.is_active.is_(True)).first()
    if not row:
        return None
    row.last_used_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    user = db.get(User, row.created_by) if row.created_by else None
    if user and not user.is_active:
        return None
    if user and user.org_id != row.org_id:
        return None
    return user


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    api_key: str | None = Header(default=None, alias="X-API-Key"),
    db: Session = Depends(get_db),
) -> User | None:
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str | None = payload.get("sub")
            if username is None:
                return None
        except JWTError:
            return None
        return db.query(User).filter(User.username == username).first()
    if api_key:
        return _user_from_api_key(api_key, db)
    return None


def require_user(user: User | None = Depends(get_current_user)) -> User:
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    return user


def require_permission(permission: Permission) -> Callable:
    """Dependency factory: returns a dependency that enforces a permission."""

    def _dependency(user: User = Depends(require_user)) -> User:
        if not has_permission(user.role, permission):
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: {permission.value} required",
            )
        return user

    return _dependency


# Convenience aliases for common checks
require_admin = require_permission(Permission.ORG_WRITE)
require_editor = require_permission(Permission.RESOURCE_WRITE)
require_viewer = require_permission(Permission.RESOURCE_READ)
