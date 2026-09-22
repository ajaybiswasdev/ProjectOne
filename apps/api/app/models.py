from datetime import datetime, timezone

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    industry: Mapped[str] = mapped_column(String(40), default="professional", index=True)
    app_name: Mapped[str] = mapped_column(String(120), default="Dashboard")
    logo_url: Mapped[str] = mapped_column(String(512), default="")
    primary_color: Mapped[str] = mapped_column(String(20), default="#6366f1")
    accent_color: Mapped[str] = mapped_column(String(20), default="#10b981")
    unit_label: Mapped[str] = mapped_column(String(40), default="Resources")
    settings_json: Mapped[str] = mapped_column(Text, default="{}")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[str] = mapped_column(String(60), default=_utcnow)

    users: Mapped[list["User"]] = relationship(back_populates="organization")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    org_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id"), index=True, default=0)
    username: Mapped[str] = mapped_column(String(80), index=True)
    email: Mapped[str] = mapped_column(String(160), index=True)
    hashed_password: Mapped[str] = mapped_column(String(256))
    role: Mapped[str] = mapped_column(String(20), default="viewer", index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[str] = mapped_column(String(60), default=_utcnow)

    organization: Mapped[Organization | None] = relationship(back_populates="users")


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    org_id: Mapped[int] = mapped_column(Integer, index=True, default=0)
    employee_id: Mapped[str] = mapped_column(String(32), index=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    level: Mapped[str] = mapped_column(String(120), index=True)
    skill: Mapped[str] = mapped_column(String(160), default="", index=True)
    department: Mapped[str] = mapped_column(String(160), index=True)
    location: Mapped[str] = mapped_column(String(120), index=True)
    days_on_bench: Mapped[int] = mapped_column(Integer, index=True)
    age_bucket: Mapped[str] = mapped_column(String(40), index=True)
    deployable: Mapped[str] = mapped_column(String(40), index=True)
    rmg_status: Mapped[str] = mapped_column(String(120), index=True)
    status: Mapped[str] = mapped_column(String(40), index=True)
    experience_bucket: Mapped[str] = mapped_column(String(40), index=True)
    hrbp: Mapped[str] = mapped_column(String(80), index=True)
    leader: Mapped[str] = mapped_column(String(80), index=True)
