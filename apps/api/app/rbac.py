"""Role-Based Access Control (RBAC) for the multi-tenant SaaS."""

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


ROLE_PERMISSIONS: dict[str, set[Permission]] = {
    Role.VIEWER: {
        Permission.RESOURCE_READ,
        Permission.EXPORT,
        Permission.ORG_READ,
    },
    Role.EDITOR: {
        Permission.RESOURCE_READ,
        Permission.RESOURCE_WRITE,
        Permission.EXPORT,
        Permission.IMPORT,
        Permission.ORG_READ,
    },
    Role.ADMIN: {
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
    },
    Role.OWNER: {
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
    },
}


def has_permission(role: str, permission: Permission) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, set())


def permissions_for(role: str) -> list[str]:
    return sorted(p.value for p in ROLE_PERMISSIONS.get(role, set()))
