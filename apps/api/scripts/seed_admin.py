"""Seed the default admin user into the database."""

import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.auth import get_password_hash
from app.database import SessionLocal
from app.models import User


def seed_admin():
    with SessionLocal() as db:
        existing = db.query(User).filter(User.username == "admin").first()
        if existing:
            print("Admin user already exists, skipping.")
            return

        admin = User(
            username="admin",
            email="admin@bench-dashboard.local",
            hashed_password=get_password_hash("admin123"),
            role="admin",
            is_active=True,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        db.add(admin)
        db.commit()
        print("Admin user created: admin / admin123")


if __name__ == "__main__":
    seed_admin()
