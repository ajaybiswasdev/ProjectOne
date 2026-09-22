"""Plan definitions and soft-limit helpers (billing hooks)."""

from typing import TypedDict


class PlanInfo(TypedDict):
    name: str
    max_users: int
    max_resources: int
    rate_limit: int
    price_month: int


PLANS: dict[str, PlanInfo] = {
    "free": {
        "name": "Free",
        "max_users": 5,
        "max_resources": 500,
        "rate_limit": 120,
        "price_month": 0,
    },
    "pro": {
        "name": "Pro",
        "max_users": 25,
        "max_resources": 25_000,
        "rate_limit": 300,
        "price_month": 49,
    },
    "enterprise": {
        "name": "Enterprise",
        "max_users": 10_000,
        "max_resources": 500_000,
        "rate_limit": 600,
        "price_month": 299,
    },
}

DEFAULT_PLAN = "free"


def plan_for(org_plan: str | None) -> PlanInfo:
    return PLANS.get(org_plan or DEFAULT_PLAN, PLANS[DEFAULT_PLAN])


def valid_plan(plan: str) -> bool:
    return plan in PLANS
