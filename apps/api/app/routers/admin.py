import csv
import io
import json
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.audit import audit
from app.auth import (
    create_access_token,
    get_password_hash,
    require_permission,
    require_user,
    verify_password,
)
from app.config import get_settings
from app.database import get_db
from app.models import ApiKey, AuditLog, AuthToken, Organization, Resource, User
from app.plans import PLANS, plan_for, valid_plan
from app.rbac import (
    Permission,
    permissions_for,
    remap_role_for_industry,
    roles_for_industry,
    role_keys_for_industry,
)
from app.schemas import ResourceRead
from app.security import (
    INVITE_TOKEN_TTL_HOURS,
    RESET_TOKEN_TTL_HOURS,
    new_api_key,
    new_token,
    token_expiry,
    token_is_expired,
)

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


class RegisterTeammate(BaseModel):
    email: EmailStr
    role: str = Field(default="viewer", max_length=40)


class RegisterInviteLink(BaseModel):
    email: str
    role: str
    link: str
    expires_at: str


class RegisterResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    invites: list[RegisterInviteLink] = []


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    org_name: str = Field(min_length=2, max_length=120)
    industry: str = Field(default="professional", max_length=40)
    teammates: list[RegisterTeammate] = Field(default_factory=list, max_length=10)


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


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10, max_length=128)
    password: str = Field(min_length=6, max_length=128)


class InviteCreate(BaseModel):
    email: EmailStr
    role: str = "viewer"


class InviteRead(BaseModel):
    id: int
    email: str
    role: str
    kind: str
    expires_at: str
    used_at: str
    created_at: str


class InvitePreview(BaseModel):
    email: str
    role: str
    org_name: str
    valid: bool


class InviteAccept(BaseModel):
    token: str = Field(min_length=10, max_length=128)
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=6, max_length=128)


class ResetLinkResponse(BaseModel):
    token: str
    link: str
    expires_at: str


class SetPasswordRequest(BaseModel):
    password: str = Field(min_length=6, max_length=128)


class AuditEntry(BaseModel):
    id: int
    user_id: int | None
    username: str
    action: str
    resource: str
    detail: str
    created_at: str


class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class ApiKeyRead(BaseModel):
    id: int
    name: str
    prefix: str
    is_active: bool
    last_used_at: str
    created_at: str


class ApiKeyCreated(ApiKeyRead):
    key: str


class PlanUsage(BaseModel):
    plan: str
    plan_name: str
    max_users: int
    max_resources: int
    rate_limit: int
    price_month: int
    users: int
    resources: int
    seats_remaining: int
    can_invite: bool


class PlanUpdate(BaseModel):
    plan: str


class RoleOption(BaseModel):
    value: str
    label: str
    desc: str


class RoleList(BaseModel):
    industry: str
    roles: list[RoleOption]


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


def _frontend_link(path: str) -> str:
    return f"{get_settings().frontend_url.rstrip('/')}{path}"


def _active_token(db: Session, token: str, kind: str) -> AuthToken | None:
    row = db.query(AuthToken).filter(AuthToken.token == token, AuthToken.kind == kind).first()
    if not row:
        return None
    if row.used_at or token_is_expired(row.expires_at):
        return None
    return row


def _org_user_count(db: Session, org_id: int) -> int:
    return db.query(func.count(User.id)).filter(User.org_id == org_id).scalar() or 0


def _org_resource_count(db: Session, org_id: int) -> int:
    return db.query(func.count(Resource.id)).filter(Resource.org_id == org_id).scalar() or 0


def _org_industry(db: Session, org_id: int) -> str:
    org = db.get(Organization, org_id)
    return org.industry if org else "professional"


def _require_role_in_industry(role: str, industry: str) -> None:
    keys = role_keys_for_industry(industry)
    if role not in keys:
        allowed = ", ".join(sorted(keys))
        raise HTTPException(status_code=422, detail=f"Role must be one of: {allowed}")


# ── Auth endpoints ────────────────────────────────────────────────────────────

@auth_router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    audit(
        db,
        org_id=user.org_id,
        user=user,
        action="auth.login",
        resource="auth",
        detail=f"{user.username} signed in",
        commit=True,
    )
    org = db.get(Organization, user.org_id)
    return _token_response(user, org)


@auth_router.post("/register", response_model=RegisterResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    industry = req.industry if req.industry in VALID_INDUSTRIES else "professional"
    preset = INDUSTRY_PRESETS[industry]
    allowed_roles = role_keys_for_industry(industry)

    seen_emails: set[str] = {req.email.lower()}
    for mate in req.teammates:
        key = mate.email.lower()
        if key in seen_emails:
            raise HTTPException(status_code=400, detail=f"Duplicate teammate email: {mate.email}")
        seen_emails.add(key)
        if mate.role not in allowed_roles:
            allowed = ", ".join(sorted(allowed_roles))
            raise HTTPException(status_code=422, detail=f"Teammate role must be one of: {allowed}")
        if mate.role == "owner":
            raise HTTPException(status_code=422, detail="Only the workspace creator can be Owner")
        if db.query(User).filter(User.email == mate.email).first():
            raise HTTPException(status_code=400, detail=f"Email already registered: {mate.email}")

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
    db.flush()
    audit(
        db,
        org_id=org.id,
        user=user,
        action="org.registered",
        resource="org",
        detail=f"Workspace '{org.name}' created by {user.username}",
    )

    invites: list[RegisterInviteLink] = []
    for mate in req.teammates:
        token = new_token()
        expires = token_expiry(INVITE_TOKEN_TTL_HOURS)
        db.add(
            AuthToken(
                org_id=org.id,
                email=mate.email,
                role=mate.role,
                token=token,
                kind="invite",
                expires_at=expires,
                created_by=user.id,
            )
        )
        invites.append(
            RegisterInviteLink(
                email=mate.email,
                role=mate.role,
                link=_frontend_link(f"/invite?token={token}"),
                expires_at=expires,
            )
        )
        audit(
            db,
            org_id=org.id,
            user=user,
            action="invite.created",
            resource="users",
            detail=f"{mate.email} as {mate.role} (at signup)",
        )

    db.commit()
    db.refresh(user)
    return RegisterResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        invites=invites,
    )


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


@auth_router.get("/roles", response_model=RoleList)
def public_roles(industry: str = "professional", db: Session = Depends(get_db)):
    """Public role catalog for the register page (no auth)."""
    _ = db
    ind = industry if industry in VALID_INDUSTRIES else "professional"
    return RoleList(industry=ind, roles=[RoleOption(**r) for r in roles_for_industry(ind)])


# ── Password reset (self-service + admin-mediated; no SMTP required) ─────────

@auth_router.post("/password/forgot")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    settings_ = get_settings()
    if user and user.is_active:
        org = db.get(Organization, user.org_id)
        token = new_token()
        db.add(
            AuthToken(
                org_id=user.org_id,
                user_id=user.id,
                email=user.email,
                username=user.username,
                token=token,
                kind="reset",
                expires_at=token_expiry(RESET_TOKEN_TTL_HOURS),
            )
        )
        audit(
            db,
            org_id=user.org_id,
            user=user,
            action="password.reset.requested",
            resource="auth",
            detail=f"Reset requested for {user.email}",
        )
        db.commit()
        # Debug only: without SMTP we never return links in production.
        if settings_.debug:
            return {
                "detail": "If that email exists, a reset link has been created.",
                "dev_link": _frontend_link(f"/reset-password?token={token}"),
            }
        _ = org
    return {"detail": "If that email exists, a reset link has been created."}


@auth_router.post("/password/reset")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    row = _active_token(db, req.token, "reset")
    if not row:
        raise HTTPException(status_code=400, detail="Reset link is invalid or has expired")
    user = db.get(User, row.user_id) if row.user_id else None
    if not user:
        user = db.query(User).filter(User.email == row.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Account no longer exists")
    user.hashed_password = get_password_hash(req.password)
    row.used_at = datetime.now(timezone.utc).isoformat()
    # Invalidate any other outstanding reset tokens for this user
    db.query(AuthToken).filter(
        AuthToken.kind == "reset",
        AuthToken.user_id == user.id,
        AuthToken.used_at == "",
    ).update({"used_at": row.used_at}, synchronize_session=False)
    audit(
        db,
        org_id=user.org_id,
        user=user,
        action="password.reset.completed",
        resource="auth",
        detail=f"Password reset for {user.username}",
    )
    db.commit()
    return {"detail": "Password updated. You can sign in now."}


@auth_router.get("/invite/{token}", response_model=InvitePreview)
def preview_invite(token: str, db: Session = Depends(get_db)):
    row = _active_token(db, token, "invite")
    if not row:
        raise HTTPException(status_code=400, detail="Invite link is invalid or has expired")
    org = db.get(Organization, row.org_id)
    return InvitePreview(
        email=row.email,
        role=row.role,
        org_name=org.name if org else "",
        valid=True,
    )


@auth_router.post("/invite/accept", response_model=UserRead)
def accept_invite(req: InviteAccept, db: Session = Depends(get_db)):
    row = _active_token(db, req.token, "invite")
    if not row:
        raise HTTPException(status_code=400, detail="Invite link is invalid or has expired")
    org = db.get(Organization, row.org_id)
    if not org or not org.is_active:
        raise HTTPException(status_code=403, detail="Workspace is inactive")
    if db.query(User).filter(User.org_id == row.org_id, User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.org_id == row.org_id, User.email == row.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    plan = plan_for(org.plan)
    if _org_user_count(db, row.org_id) >= plan["max_users"]:
        raise HTTPException(status_code=403, detail="Plan seat limit reached. Upgrade to invite more members.")

    user = User(
        org_id=row.org_id,
        username=req.username,
        email=row.email,
        hashed_password=get_password_hash(req.password),
        role=remap_role_for_industry(row.role, org.industry)
        if row.role not in role_keys_for_industry(org.industry)
        else row.role,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(user)
    row.used_at = datetime.now(timezone.utc).isoformat()
    db.flush()
    audit(
        db,
        org_id=row.org_id,
        user=user,
        action="invite.accepted",
        resource="users",
        detail=f"{user.username} joined as {user.role}",
    )
    db.commit()
    db.refresh(user)
    return user


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
        industry_changed = data.industry != org.industry
        org.industry = data.industry
        preset = INDUSTRY_PRESETS[data.industry]
        if data.app_name is None:
            org.app_name = preset["app_name"]
        if data.unit_label is None:
            org.unit_label = preset["unit_label"]
        if industry_changed:
            # Remap non-admin roles into the new industry catalog
            for member in db.query(User).filter(User.org_id == org.id).all():
                if member.role in ("owner", "admin"):
                    continue
                new_role = remap_role_for_industry(member.role, data.industry)
                if new_role != member.role:
                    member.role = new_role
    if data.settings_json is not None:
        org.settings_json = json.dumps(data.settings_json)

    audit(
        db,
        org_id=org.id,
        user=user,
        action="org.settings.updated",
        resource="org",
        detail=json.dumps(data.model_dump(exclude_none=True)),
    )
    db.commit()
    db.refresh(org)
    return _org_read(org)


# ── Industry roles ───────────────────────────────────────────────────────────

@admin_router.get("/roles", response_model=RoleList)
def org_roles(
    user: User = Depends(require_permission(Permission.USER_READ)),
    db: Session = Depends(get_db),
):
    ind = _org_industry(db, user.org_id)
    return RoleList(industry=ind, roles=[RoleOption(**r) for r in roles_for_industry(ind)])


# ── Plan / billing hooks ─────────────────────────────────────────────────────

@org_router.get("/plan", response_model=PlanUsage)
def get_plan(
    user: User = Depends(require_permission(Permission.ORG_READ)),
    db: Session = Depends(get_db),
):
    org = db.get(Organization, user.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    info = plan_for(org.plan)
    users = _org_user_count(db, org.id)
    resources = _org_resource_count(db, org.id)
    seats = max(info["max_users"] - users, 0)
    return PlanUsage(
        plan=org.plan,
        plan_name=info["name"],
        max_users=info["max_users"],
        max_resources=info["max_resources"],
        rate_limit=info["rate_limit"],
        price_month=info["price_month"],
        users=users,
        resources=resources,
        seats_remaining=seats,
        can_invite=seats > 0,
    )


@org_router.put("/plan", response_model=PlanUsage)
def update_plan(
    body: PlanUpdate,
    user: User = Depends(require_permission(Permission.ORG_WRITE)),
    db: Session = Depends(get_db),
):
    if user.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners/admins can change the plan")
    if not valid_plan(body.plan):
        raise HTTPException(status_code=422, detail=f"Plan must be one of: {', '.join(PLANS)}")
    org = db.get(Organization, user.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    old = org.plan
    org.plan = body.plan
    org.rate_limit = plan_for(body.plan)["rate_limit"]
    audit(
        db,
        org_id=org.id,
        user=user,
        action="plan.changed",
        resource="billing",
        detail=f"{old} -> {body.plan}",
    )
    db.commit()
    return get_plan(user=user, db=db)


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
    industry = _org_industry(db, admin.org_id)
    _require_role_in_industry(req.role, industry)
    if req.role == "owner" and admin.role != "owner":
        raise HTTPException(status_code=403, detail="Only the owner can create another owner")
    if db.query(User).filter(User.org_id == admin.org_id, User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.org_id == admin.org_id, User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    org = db.get(Organization, admin.org_id)
    plan = plan_for(org.plan if org else None)
    if _org_user_count(db, admin.org_id) >= plan["max_users"]:
        raise HTTPException(status_code=403, detail="Plan seat limit reached. Upgrade to invite more members.")

    new_user = User(
        org_id=admin.org_id,
        username=req.username,
        email=req.email,
        hashed_password=get_password_hash(req.password),
        role=req.role,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(new_user)
    audit(
        db,
        org_id=admin.org_id,
        user=admin,
        action="user.created",
        resource="users",
        detail=f"{new_user.username} ({new_user.role})",
    )
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
    industry = _org_industry(db, admin.org_id)
    _require_role_in_industry(new_role, industry)
    if new_role == "owner" and admin.role != "owner":
        raise HTTPException(status_code=403, detail="Only the owner can grant owner role")
    old_role = target.role
    target.role = new_role
    audit(
        db,
        org_id=admin.org_id,
        user=admin,
        action="user.role.changed",
        resource="users",
        detail=f"{target.username}: {old_role} -> {new_role}",
    )
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
    audit(
        db,
        org_id=admin.org_id,
        user=admin,
        action="user.deleted",
        resource="users",
        detail=f"{target.username} ({target.role})",
    )
    db.delete(target)
    db.commit()
    return {"detail": "User deleted"}


# ── Invites (email-link based; copy link manually when SMTP is off) ──────────

@admin_router.get("/invites", response_model=list[InviteRead])
def list_invites(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.USER_READ)),
):
    rows = (
        db.query(AuthToken)
        .filter(AuthToken.org_id == user.org_id, AuthToken.kind == "invite")
        .order_by(AuthToken.id.desc())
        .all()
    )
    return [
        InviteRead(
            id=r.id,
            email=r.email,
            role=r.role,
            kind=r.kind,
            expires_at=r.expires_at,
            used_at=r.used_at,
            created_at=r.created_at,
        )
        for r in rows
    ]


@admin_router.post("/invites", response_model=ResetLinkResponse)
def create_invite(
    body: InviteCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission(Permission.USER_WRITE)),
):
    if body.role not in role_keys_for_industry(_org_industry(db, admin.org_id)):
        industry = _org_industry(db, admin.org_id)
        allowed = ", ".join(sorted(role_keys_for_industry(industry)))
        raise HTTPException(status_code=422, detail=f"Role must be one of: {allowed}")
    if body.role == "owner" and admin.role != "owner":
        raise HTTPException(status_code=403, detail="Only the owner can invite an owner")
    if db.query(User).filter(User.org_id == admin.org_id, User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(AuthToken).filter(
        AuthToken.org_id == admin.org_id,
        AuthToken.email == body.email,
        AuthToken.kind == "invite",
        AuthToken.used_at == "",
    ).first():
        raise HTTPException(status_code=400, detail="An active invite already exists for this email")

    org = db.get(Organization, admin.org_id)
    plan = plan_for(org.plan if org else None)
    if _org_user_count(db, admin.org_id) >= plan["max_users"]:
        raise HTTPException(status_code=403, detail="Plan seat limit reached. Upgrade to invite more members.")

    token = new_token()
    expires = token_expiry(INVITE_TOKEN_TTL_HOURS)
    db.add(
        AuthToken(
            org_id=admin.org_id,
            email=body.email,
            role=body.role,
            token=token,
            kind="invite",
            expires_at=expires,
            created_by=admin.id,
        )
    )
    audit(
        db,
        org_id=admin.org_id,
        user=admin,
        action="invite.created",
        resource="users",
        detail=f"{body.email} as {body.role}",
    )
    db.commit()
    return ResetLinkResponse(token=token, link=_frontend_link(f"/invite?token={token}"), expires_at=expires)


@admin_router.delete("/invites/{invite_id}")
def revoke_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission(Permission.USER_WRITE)),
):
    row = db.get(AuthToken, invite_id)
    if not row or row.org_id != admin.org_id or row.kind != "invite":
        raise HTTPException(status_code=404, detail="Invite not found")
    audit(
        db,
        org_id=admin.org_id,
        user=admin,
        action="invite.revoked",
        resource="users",
        detail=f"{row.email}",
    )
    db.delete(row)
    db.commit()
    return {"detail": "Invite revoked"}


@admin_router.post("/users/{user_id}/reset-link", response_model=ResetLinkResponse)
def admin_reset_link(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission(Permission.USER_WRITE)),
):
    target = db.get(User, user_id)
    if not target or target.org_id != admin.org_id:
        raise HTTPException(status_code=404, detail="User not found")
    token = new_token()
    expires = token_expiry(RESET_TOKEN_TTL_HOURS)
    db.add(
        AuthToken(
            org_id=target.org_id,
            user_id=target.id,
            email=target.email,
            username=target.username,
            token=token,
            kind="reset",
            expires_at=expires,
            created_by=admin.id,
        )
    )
    audit(
        db,
        org_id=admin.org_id,
        user=admin,
        action="password.reset.link.created",
        resource="users",
        detail=f"Reset link for {target.username}",
    )
    db.commit()
    return ResetLinkResponse(token=token, link=_frontend_link(f"/reset-password?token={token}"), expires_at=expires)


@admin_router.put("/users/{user_id}/password", response_model=UserRead)
def admin_set_password(
    user_id: int,
    body: SetPasswordRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission(Permission.USER_WRITE)),
):
    target = db.get(User, user_id)
    if not target or target.org_id != admin.org_id:
        raise HTTPException(status_code=404, detail="User not found")
    target.hashed_password = get_password_hash(body.password)
    audit(
        db,
        org_id=admin.org_id,
        user=admin,
        action="password.reset.by_admin",
        resource="users",
        detail=f"Password set for {target.username}",
    )
    db.commit()
    db.refresh(target)
    return target


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

    audit(
        db,
        org_id=user.org_id,
        user=user,
        action="resources.imported",
        resource="resources",
        detail=f"created={created} updated={updated} errors={len(errors)}",
    )
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


# ── Audit log ────────────────────────────────────────────────────────────────

@admin_router.get("/audit", response_model=list[AuditEntry])
def list_audit(
    limit: int = 50,
    action: str = "",
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.ORG_WRITE)),
):
    q = db.query(AuditLog).filter(AuditLog.org_id == user.org_id)
    if action:
        q = q.filter(AuditLog.action == action)
    rows = q.order_by(AuditLog.id.desc()).limit(min(max(limit, 1), 200)).all()
    return [
        AuditEntry(
            id=r.id,
            user_id=r.user_id,
            username=r.username,
            action=r.action,
            resource=r.resource,
            detail=r.detail,
            created_at=r.created_at,
        )
        for r in rows
    ]


# ── API keys ─────────────────────────────────────────────────────────────────

@admin_router.get("/api-keys", response_model=list[ApiKeyRead])
def list_api_keys(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.ORG_WRITE)),
):
    rows = (
        db.query(ApiKey)
        .filter(ApiKey.org_id == user.org_id)
        .order_by(ApiKey.id.desc())
        .all()
    )
    return [
        ApiKeyRead(
            id=r.id,
            name=r.name,
            prefix=r.prefix,
            is_active=r.is_active,
            last_used_at=r.last_used_at,
            created_at=r.created_at,
        )
        for r in rows
    ]


@admin_router.post("/api-keys", response_model=ApiKeyCreated)
def create_api_key(
    body: ApiKeyCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.ORG_WRITE)),
):
    full_key, prefix, key_hash = new_api_key()
    row = ApiKey(
        org_id=user.org_id,
        name=body.name,
        prefix=prefix,
        key_hash=key_hash,
        created_by=user.id,
    )
    db.add(row)
    audit(
        db,
        org_id=user.org_id,
        user=user,
        action="api_key.created",
        resource="api_keys",
        detail=f"{body.name} ({prefix})",
    )
    db.commit()
    db.refresh(row)
    return ApiKeyCreated(
        id=row.id,
        name=row.name,
        prefix=row.prefix,
        is_active=row.is_active,
        last_used_at=row.last_used_at,
        created_at=row.created_at,
        key=full_key,
    )


@admin_router.delete("/api-keys/{key_id}")
def delete_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.ORG_WRITE)),
):
    row = db.get(ApiKey, key_id)
    if not row or row.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="API key not found")
    audit(
        db,
        org_id=user.org_id,
        user=user,
        action="api_key.deleted",
        resource="api_keys",
        detail=f"{row.name} ({row.prefix})",
    )
    db.delete(row)
    db.commit()
    return {"detail": "API key deleted"}
