"""Role-Based Access Control (RBAC) for the multi-tenant SaaS.

Each industry has its own role set (keys + labels). Permission checks use a
flattened map so legacy role keys (editor/viewer) keep working.
"""

from enum import StrEnum


class Role(StrEnum):
    OWNER = "owner"
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class Permission(StrEnum):
    # Data
    RESOURCE_READ = "resource:read"
    RESOURCE_WRITE = "resource:write"
    RESOURCE_DELETE = "resource:delete"
    # Users
    USER_READ = "user:read"
    USER_WRITE = "user:write"
    USER_DELETE = "user:delete"
    # Org / settings
    ORG_READ = "org:read"
    ORG_WRITE = "org:write"
    ORG_DELETE = "org:delete"
    # Import / export
    IMPORT = "data:import"
    EXPORT = "data:export"


_OWNER_PERMS = {
    Permission.RESOURCE_READ,
    Permission.RESOURCE_WRITE,
    Permission.RESOURCE_DELETE,
    Permission.USER_READ,
    Permission.USER_WRITE,
    Permission.USER_DELETE,
    Permission.ORG_READ,
    Permission.ORG_WRITE,
    Permission.ORG_DELETE,
    Permission.IMPORT,
    Permission.EXPORT,
}

_ADMIN_PERMS = {
    Permission.RESOURCE_READ,
    Permission.RESOURCE_WRITE,
    Permission.RESOURCE_DELETE,
    Permission.USER_READ,
    Permission.USER_WRITE,
    Permission.USER_DELETE,
    Permission.ORG_READ,
    Permission.ORG_WRITE,
    Permission.IMPORT,
    Permission.EXPORT,
}

_EDITOR_PERMS = {
    Permission.RESOURCE_READ,
    Permission.RESOURCE_WRITE,
    Permission.EXPORT,
    Permission.IMPORT,
    Permission.ORG_READ,
}

_VIEWER_PERMS = {
    Permission.RESOURCE_READ,
    Permission.EXPORT,
    Permission.ORG_READ,
}

# Read-only without export (healthcare observer)
_OBSERVER_PERMS = {
    Permission.RESOURCE_READ,
    Permission.ORG_READ,
}


def _role(key: str, label: str, desc: str, perms: set[Permission]) -> dict:
    return {"value": key, "label": label, "desc": desc, "permissions": perms}


# ── Industry role catalogs ───────────────────────────────────────────────────

INDUSTRY_ROLES: dict[str, list[dict]] = {
    "professional": [
        _role("owner", "Owner", "Full control of the workspace", _OWNER_PERMS),
        _role("admin", "Admin", "Manage users & settings", _ADMIN_PERMS),
        _role("editor", "Editor", "Add and edit workforce data", _EDITOR_PERMS),
        _role("viewer", "Viewer", "Read-only access", _VIEWER_PERMS),
    ],
    "healthcare": [
        _role("owner", "Owner", "Full control of the workspace", _OWNER_PERMS),
        _role("admin", "Admin", "Manage clinical team & settings", _ADMIN_PERMS),
        _role(
            "clinical_editor",
            "Clinical Editor",
            "Update staffing & bench records",
            _EDITOR_PERMS,
        ),
        _role(
            "observer",
            "Observer",
            "Read-only clinical access (no export)",
            _OBSERVER_PERMS,
        ),
    ],
    "education": [
        _role("owner", "Owner", "Full control of the workspace", _OWNER_PERMS),
        _role("admin", "Admin", "Manage faculty & settings", _ADMIN_PERMS),
        _role(
            "faculty_editor",
            "Faculty Editor",
            "Update cohort & placement data",
            _EDITOR_PERMS,
        ),
        _role("viewer", "Viewer", "Read-only academic access", _VIEWER_PERMS),
    ],
}

DEFAULT_INDUSTRY = "professional"

# Flattened permission lookup (all industries + legacy keys)
ROLE_PERMISSIONS: dict[str, set[Permission]] = {
    r["value"]: r["permissions"]
    for roles in INDUSTRY_ROLES.values()
    for r in roles
}

# When industry changes, remap non-owner/admin roles to the closest equivalent
INDUSTRY_ROLE_REMAP = {
    "professional": {
        "clinical_editor": "editor",
        "faculty_editor": "editor",
        "observer": "viewer",
    },
    "healthcare": {
        "editor": "clinical_editor",
        "faculty_editor": "clinical_editor",
        "viewer": "observer",
    },
    "education": {
        "editor": "faculty_editor",
        "clinical_editor": "faculty_editor",
        "observer": "viewer",
    },
}


def roles_for_industry(industry: str | None) -> list[dict]:
    catalog = INDUSTRY_ROLES.get(industry or DEFAULT_INDUSTRY)
    if not catalog:
        catalog = INDUSTRY_ROLES[DEFAULT_INDUSTRY]
    return [
        {"value": r["value"], "label": r["label"], "desc": r["desc"]}
        for r in catalog
    ]


def role_keys_for_industry(industry: str | None) -> set[str]:
    return {r["value"] for r in roles_for_industry(industry)}


def is_owner_role(role: str) -> bool:
    return role == "owner"


def remap_role_for_industry(role: str, industry: str | None) -> str:
    """Keep users valid when org industry (and role catalog) changes."""
    keys = role_keys_for_industry(industry)
    if role in keys:
        return role
    if role in ("owner", "admin"):
        return role
    mapping = INDUSTRY_ROLE_REMAP.get(industry or DEFAULT_INDUSTRY, {})
    return mapping.get(role, role)


def has_permission(role: str, permission: Permission) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, set())


def permissions_for(role: str) -> list[str]:
    return sorted(p.value for p in ROLE_PERMISSIONS.get(role, set()))
