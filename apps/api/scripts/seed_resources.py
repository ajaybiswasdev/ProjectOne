import json
from pathlib import Path

from sqlalchemy.dialects.postgresql import insert

from app.database import Base, SessionLocal, engine
from app.models import Resource

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "app" / "seed_data" / "resources.json"


def map_resource(row: dict) -> dict:
    return {
        "id": row["id"],
        "employee_id": row["eid"],
        "name": row["name"],
        "level": row["level"],
        "skill": row.get("skill") or "",
        "department": row["dept"],
        "location": row["loc"],
        "days_on_bench": row["days"],
        "age_bucket": row["age"],
        "deployable": row["deployable"],
        "rmg_status": row["rmg"],
        "status": row["status"],
        "experience_bucket": row["exp"],
        "hrbp": row["hrbp"],
        "leader": row["leader"],
    }


def main() -> None:
    Base.metadata.create_all(bind=engine)
    rows = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    payload = [map_resource(row) for row in rows]

    with SessionLocal() as db:
        stmt = insert(Resource).values(payload)
        update_cols = {
            column.name: getattr(stmt.excluded, column.name)
            for column in Resource.__table__.columns
            if column.name != "id"
        }
        db.execute(stmt.on_conflict_do_update(index_elements=["id"], set_=update_cols))
        db.commit()

    print(f"Seeded {len(payload)} resources")


if __name__ == "__main__":
    main()
