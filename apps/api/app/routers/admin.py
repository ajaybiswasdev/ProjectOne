import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_current_user,
    get_password_hash,
    require_admin,
    verify_password,
)
from app.database import get_db
from app.models import Resource, User
from app.schemas import ResourceRead

admin_router = APIRouter(prefix="/admin", tags=["admin"])
auth_router = APIRouter(prefix="/auth", tags=["auth"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str = "admin"


class UserRead(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: str

    model_config = {"from_attributes": True}


class ResourceCreate(BaseModel):
    employee_id: str
    name: str
    level: str
    skill: str = ""
    department: str
    location: str
    days_on_bench: int
    age_bucket: str
    deployable: str
    rmg_status: str
    status: str
    experience_bucket: str
    hrbp: str
    leader: str


class ResourceUpdate(BaseModel):
    employee_id: str | None = None
    name: str | None = None
    level: str | None = None
    skill: str | None = None
    department: str | None = None
    location: str | None = None
    days_on_bench: int | None = None
    age_bucket: str | None = None
    deployable: str | None = None
    rmg_status: str | None = None
    status: str | None = None
    experience_bucket: str | None = None
    hrbp: str | None = None
    leader: str | None = None


class AdminStats(BaseModel):
    total_users: int
    total_resources: int
    deployable_count: int
    critical_count: int


# ── Auth endpoints ────────────────────────────────────────────────────────────

@auth_router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    token = create_access_token({"sub": user.username})
    return TokenResponse(access_token=token, role=user.role)


@auth_router.post("/register", response_model=UserRead)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if req.role not in ("admin", "viewer"):
        raise HTTPException(status_code=422, detail="Role must be admin or viewer")
    user = User(
        username=req.username,
        email=req.email,
        hashed_password=get_password_hash(req.password),
        role=req.role,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@auth_router.get("/me", response_model=UserRead)
def get_me(user: User = Depends(get_current_user)):
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# ── Admin user management ────────────────────────────────────────────────────

@admin_router.get("/users", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return db.query(User).order_by(User.id).all()


@admin_router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    db.delete(user)
    db.commit()
    return {"detail": "User deleted"}


# ── Admin resource CRUD ──────────────────────────────────────────────────────

@admin_router.post("/resources", response_model=ResourceRead)
def create_resource(
    data: ResourceCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    if db.query(Resource).filter(Resource.employee_id == data.employee_id).first():
        raise HTTPException(status_code=400, detail="Employee ID already exists")
    resource = Resource(**data.model_dump())
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


@admin_router.put("/resources/{resource_id}", response_model=ResourceRead)
def update_resource(
    resource_id: int,
    data: ResourceUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    resource = db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(resource, field, value)
    db.commit()
    db.refresh(resource)
    return resource


@admin_router.delete("/resources/{resource_id}")
def delete_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    resource = db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    db.delete(resource)
    db.commit()
    return {"detail": "Resource deleted"}


# ── CSV Import ───────────────────────────────────────────────────────────────

CSV_COLUMNS = [
    "employee_id", "name", "level", "skill", "department", "location",
    "days_on_bench", "age_bucket", "deployable", "rmg_status",
    "status", "experience_bucket", "hrbp", "leader",
]


@admin_router.post("/import")
async def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")

    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    missing = [c for c in CSV_COLUMNS if c not in (reader.fieldnames or [])]
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing columns: {', '.join(missing)}")

    created = 0
    updated = 0
    errors = []

    for i, row in enumerate(reader, start=2):
        try:
            employee_id = row["employee_id"].strip()
            existing = db.query(Resource).filter(Resource.employee_id == employee_id).first()

            fields = {
                "name": row["name"].strip(),
                "level": row["level"].strip(),
                "skill": row.get("skill", "").strip(),
                "department": row["department"].strip(),
                "location": row["location"].strip(),
                "days_on_bench": int(row["days_on_bench"]),
                "age_bucket": row["age_bucket"].strip(),
                "deployable": row["deployable"].strip(),
                "rmg_status": row["rmg_status"].strip(),
                "status": row["status"].strip(),
                "experience_bucket": row["experience_bucket"].strip(),
                "hrbp": row["hrbp"].strip(),
                "leader": row["leader"].strip(),
            }

            if existing:
                for k, v in fields.items():
                    setattr(existing, k, v)
                updated += 1
            else:
                resource = Resource(employee_id=employee_id, **fields)
                db.add(resource)
                created += 1
        except Exception as e:
            errors.append(f"Row {i}: {e}")

    db.commit()
    return {
        "created": created,
        "updated": updated,
        "errors": errors,
        "total_processed": created + updated + len(errors),
    }


# ── Admin stats ──────────────────────────────────────────────────────────────

@admin_router.get("/stats", response_model=AdminStats)
def get_admin_stats(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return AdminStats(
        total_users=db.query(func.count(User.id)).scalar() or 0,
        total_resources=db.query(func.count(Resource.id)).scalar() or 0,
        deployable_count=db.query(func.count(Resource.id)).filter(Resource.deployable == "Deployable").scalar() or 0,
        critical_count=db.query(func.count(Resource.id)).filter(Resource.age_bucket == "91+ days").scalar() or 0,
    )
