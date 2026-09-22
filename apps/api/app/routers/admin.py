import csv
import io
import json
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_current_user,
    get_password_hash,
    require_permission,
    require_user,
    verify_password,
)
from app.database import get_db
from app.models import Organization, Resource, User
from app.rbac import Permission, permissions_for
from app.schemas import ResourceRead

admin_router = APIRouter(prefix="/admin", tags=["admin"])
auth_router = APIRouter(prefix="/auth", tags=["auth"])
org_router = APIRouter(prefix="/org", tags=["org"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    org_id: int
    org_name: str
    permissions: list[str]


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    org_name: str = Field(min_length=2, max_length=120)
    industry: str = Field(default="professional", max_length=40)


class InviteUserRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: str = "viewer"


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


class OrgSettings(BaseModel):
    name: str
    slug: str
    industry: str
    app_name: str
    logo_url: str
    primary_color: str
    accent_color: str
    unit_label: str
    settings_json: dict

    model_config = {"from_attributes": True}


class OrgSettingsUpdate(BaseModel):
    name: str | None = None
    app_name: str | None = None
    logo_url: str | None = None
    primary_color: str | None = None
    accent_color: str | None = None
    unit_label: str | None = None
    industry: str | None = None
    settings_json: dict | None = None


class MeResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    org_id: int
    permissions: list[str]
    organization: OrgSettings | None


VALID_ROLES = {"owner", "admin", "editor", "viewer"}
VALID_INDUSTRIES = {"professional", "healthcare", "education"}

INDUSTRY_PRESETS = {
    "professional": {"unit_label": "Resources", "app_name": "Workforce Dashboard"},
    "healthcare": {"unit_label": "Staff", "app_name": "Clinical Staffing Dashboard"},
    "education": {"unit_label": "Cohort", "app_name": "Academic Dashboard"},
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or f"org-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"


def _unique_slug(db: Session, base: str) -> str:
    slug = _slugify(base)
    suffix = 1
    while db.query(Organization).filter(Organization.slug == slug).first():
        suffix += 1
        slug = f"{_slugify(base)}-{suffix}"
    return slug


def _org_read(org: Organization) -> OrgSettings:
    try:
        settings_dict = json.loads(org.settings_json or "{}")
    except json.JSONDecodeError:
        settings_dict = {}
    return OrgSettings(
        name=org.name,
        slug=org.slug,
        industry=org.industry,
        app_name=org.app_name,
        logo_url=org.logo_url,
        primary_color=org.primary_color,
        accent_color=org.accent_color,
        unit_label=org.unit_label,
        settings_json=settings_dict,
    )


def _token_response(user: User, org: Organization | None) -> TokenResponse:
    token = create_access_token({
        "sub": user.username,
        "org": user.org_id,
        "role": user.role,
    })
    return TokenResponse(
        access_token=token,
        role=user.role,
        org_id=user.org_id,
        org_name=org.name if org else "",
        permissions=permissions_for(user.role),
    )


# ── Auth endpoints ────────────────────────────────────────────────────────────

@auth_router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    org = db.get(Organization, user.org_id)
    return _token_response(user, org)


@auth_router.post("/register", response_model=UserRead)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    industry = req.industry if req.industry in VALID_INDUSTRIES else "professional"
    preset = INDUSTRY_PRESETS[industry]

    org = Organization(
        name=req.org_name,
        slug=_unique_slug(db, req.org_name),
        industry=industry,
        app_name=preset["app_name"],
        unit_label=preset["unit_label"],
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(org)
    db.flush()

    user = User(
        org_id=org.id,
        username=req.username,
        email=req.email,
        hashed_password=get_password_hash(req.password),
        role="owner",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@auth_router.get("/me", response_model=MeResponse)
def get_me(user: User = Depends(require_user), db: Session = Depends(get_db)):
    org = db.get(Organization, user.org_id)
    return MeResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        org_id=user.org_id,
        permissions=permissions_for(user.role),
        organization=_org_read(org) if org else None,
    )


# ── Org settings ──────────────────────────────────────────────────────────────

@org_router.get("/settings", response_model=OrgSettings)
def get_org_settings(
    user: User = Depends(require_permission(Permission.ORG_READ)),
    db: Session = Depends(get_db),
):
    org = db.get(Organization, user.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return _org_read(org)


@org_router.put("/settings", response_model=OrgSettings)
def update_org_settings(
    data: OrgSettingsUpdate,
    user: User = Depends(require_permission(Permission.ORG_WRITE)),
    db: Session = Depends(get_db),
):
    org = db.get(Organization, user.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if data.name is not None:
        org.name = data.name
    if data.app_name is not None:
        org.app_name = data.app_name
    if data.logo_url is not None:
        org.logo_url = data.logo_url
    if data.primary_color is not None:
        org.primary_color = data.primary_color
    if data.accent_color is not None:
        org.accent_color = data.accent_color
    if data.unit_label is not None:
        org.unit_label = data.unit_label
    if data.industry is not None and data.industry in VALID_INDUSTRIES:
        org.industry = data.industry
        preset = INDUSTRY_PRESETS[data.industry]
        if data.app_name is None:
            org.app_name = preset["app_name"]
        if data.unit_label is None:
            org.unit_label = preset["unit_label"]
    if data.settings_json is not None:
        org.settings_json = json.dumps(data.settings_json)

    db.commit()
    db.refresh(org)
    return _org_read(org)


# ── Admin user management ────────────────────────────────────────────────────

@admin_router.get("/users", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.USER_READ)),
):
    return (
        db.query(User)
        .filter(User.org_id == user.org_id)
        .order_by(User.id)
        .all()
    )


@admin_router.post("/users", response_model=UserRead)
def create_user(
    req: InviteUserRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission(Permission.USER_WRITE)),
):
    if req.role not in VALID_ROLES:
        raise HTTPException(status_code=422, detail=f"Role must be one of: {', '.join(sorted(VALID_ROLES))}")
    if req.role == "owner" and admin.role != "owner":
        raise HTTPException(status_code=403, detail="Only the owner can create another owner")
    if db.query(User).filter(User.org_id == admin.org_id, User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.org_id == admin.org_id, User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        org_id=admin.org_id,
        username=req.username,
        email=req.email,
        hashed_password=get_password_hash(req.password),
        role=req.role,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@admin_router.put("/users/{user_id}/role", response_model=UserRead)
def change_user_role(
    user_id: int,
    body: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission(Permission.USER_WRITE)),
):
    target = db.get(User, user_id)
    if not target or target.org_id != admin.org_id:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    new_role = body.get("role", "")
    if new_role not in VALID_ROLES:
        raise HTTPException(status_code=422, detail=f"Role must be one of: {', '.join(sorted(VALID_ROLES))}")
    if new_role == "owner" and admin.role != "owner":
        raise HTTPException(status_code=403, detail="Only the owner can grant owner role")
    target.role = new_role
    db.commit()
    db.refresh(target)
    return target


@admin_router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission(Permission.USER_DELETE)),
):
    target = db.get(User, user_id)
    if not target or target.org_id != admin.org_id:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    if target.role == "owner" and admin.role != "owner":
        raise HTTPException(status_code=403, detail="Only the owner can delete an owner")
    db.delete(target)
    db.commit()
    return {"detail": "User deleted"}


# ── Admin resource CRUD ──────────────────────────────────────────────────────

@admin_router.post("/resources", response_model=ResourceRead)
def create_resource(
    data: ResourceCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.RESOURCE_WRITE)),
):
    exists = (
        db.query(Resource)
        .filter(Resource.org_id == user.org_id, Resource.employee_id == data.employee_id)
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="Employee ID already exists")
    resource = Resource(org_id=user.org_id, **data.model_dump())
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


@admin_router.put("/resources/{resource_id}", response_model=ResourceRead)
def update_resource(
    resource_id: int,
    data: ResourceUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.RESOURCE_WRITE)),
):
    resource = db.get(Resource, resource_id)
    if not resource or resource.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Resource not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(resource, field, value)
    db.commit()
    db.refresh(resource)
    return resource


@admin_router.delete("/resources/{resource_id}")
def delete_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.RESOURCE_DELETE)),
):
    resource = db.get(Resource, resource_id)
    if not resource or resource.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Resource not found")
    db.delete(resource)
    db.commit()
    return {"detail": "Resource deleted"}


# ── CSV Import / Export ──────────────────────────────────────────────────────

CSV_COLUMNS = [
    "employee_id", "name", "level", "skill", "department", "location",
    "days_on_bench", "age_bucket", "deployable", "rmg_status",
    "status", "experience_bucket", "hrbp", "leader",
]


@admin_router.post("/import")
async def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.IMPORT)),
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
            existing = (
                db.query(Resource)
                .filter(Resource.org_id == user.org_id, Resource.employee_id == employee_id)
                .first()
            )
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
                db.add(Resource(org_id=user.org_id, employee_id=employee_id, **fields))
                created += 1
        except Exception as e:
            errors.append(f"Row {i}: {e}")

    db.commit()
    return {"created": created, "updated": updated, "errors": errors,
            "total_processed": created + updated + len(errors)}


@admin_router.get("/export")
def export_csv(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.EXPORT)),
):
    import csv as csv_mod
    from io import StringIO

    from fastapi.responses import Response

    rows = db.query(Resource).filter(Resource.org_id == user.org_id).all()
    buf = StringIO()
    writer = csv_mod.writer(buf)
    writer.writerow(CSV_COLUMNS)
    for r in rows:
        writer.writerow([
            r.employee_id, r.name, r.level, r.skill, r.department, r.location,
            r.days_on_bench, r.age_bucket, r.deployable, r.rmg_status,
            r.status, r.experience_bucket, r.hrbp, r.leader,
        ])
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=resources.csv"},
    )


# ── Admin summary & stats ────────────────────────────────────────────────────

class AdminSummary(BaseModel):
    total_resources: int
    total_users: int
    departments: int
    last_updated: str


@admin_router.get("/summary", response_model=AdminSummary)
def admin_summary(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.RESOURCE_READ)),
):
    total_resources = db.query(func.count(Resource.id)).filter(Resource.org_id == user.org_id).scalar() or 0
    total_users = db.query(func.count(User.id)).filter(User.org_id == user.org_id).scalar() or 0
    departments = (
        db.query(func.count(func.distinct(Resource.department)))
        .filter(Resource.org_id == user.org_id)
        .scalar() or 0
    )
    last = (
        db.query(func.max(Resource.id))
        .filter(Resource.org_id == user.org_id)
        .scalar()
    )
    return AdminSummary(
        total_resources=total_resources,
        total_users=total_users,
        departments=departments,
        last_updated=datetime.now(timezone.utc).isoformat() if last else "",
    )


@admin_router.get("/stats", response_model=AdminStats)
def get_admin_stats(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.ORG_READ)),
):
    org_filter = Resource.org_id == user.org_id
    return AdminStats(
        total_users=db.query(func.count(User.id)).filter(User.org_id == user.org_id).scalar() or 0,
        total_resources=db.query(func.count(Resource.id)).filter(org_filter).scalar() or 0,
        deployable_count=db.query(func.count(Resource.id)).filter(org_filter, Resource.deployable == "Deployable").scalar() or 0,
        critical_count=db.query(func.count(Resource.id)).filter(org_filter, Resource.age_bucket == "91+ days").scalar() or 0,
    )
