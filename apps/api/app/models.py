from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
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


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(256))
    role: Mapped[str] = mapped_column(String(20), default="admin")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[str] = mapped_column(String(30), default="")
