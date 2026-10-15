"""Data Q&A chatbot.

POST /chat — LLM (OpenAI-compatible) with tool calling over org-scoped bench data.
No data ever leaves the org: every tool query is filtered by user.org_id.
"""

import json
import logging
from typing import Any, Callable

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import distinct, func, or_, select
from sqlalchemy.orm import Session

from app.audit import audit
from app.auth import require_user
from app.config import get_settings
from app.database import get_db
from app.models import Organization, Resource, User

logger = logging.getLogger(__name__)

chat_router = APIRouter(prefix="/chat", tags=["chat"])

MAX_MESSAGE_LENGTH = 2000
MAX_HISTORY_MESSAGES = 12
MAX_TOOL_ROUNDS = 5
MAX_LIST_ROWS = 50

# ── Schemas ───────────────────────────────────────────────────────────────────


class ChatTurn(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = ""


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    history: list[ChatTurn] = Field(default_factory=list, max_length=MAX_HISTORY_MESSAGES)


class ChatResponse(BaseModel):
    reply: str
    tools_used: list[str] = []
    configured: bool = True


# ── Tools (org-scoped queries) ────────────────────────────────────────────────

FILTER_FIELDS = ["department", "skill", "status", "deployable", "age_bucket", "hrbp", "leader", "location"]


def _apply_common(stmt, org_id: int, args: dict[str, Any]):
    stmt = stmt.where(Resource.org_id == org_id)
    if args.get("department"):
        stmt = stmt.where(Resource.department == str(args["department"]))
    if args.get("skill"):
        stmt = stmt.where(Resource.skill.ilike(f"%{args['skill']}%"))
    if args.get("status"):
        stmt = stmt.where(Resource.status == str(args["status"]))
    if args.get("deployable"):
        stmt = stmt.where(Resource.deployable == str(args["deployable"]))
    if args.get("age_bucket"):
        stmt = stmt.where(Resource.age_bucket == str(args["age_bucket"]))
    if args.get("hrbp"):
        stmt = stmt.where(Resource.hrbp == str(args["hrbp"]))
    if args.get("leader"):
        stmt = stmt.where(Resource.leader == str(args["leader"]))
    if args.get("location"):
        stmt = stmt.where(Resource.location == str(args["location"]))
    return stmt


def _safe_limit(value: Any, default: int, maximum: int) -> int:
    try:
        n = int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default
    return max(1, min(n, maximum))


def _tool_get_overview(db: Session, org_id: int, args: dict[str, Any]) -> dict[str, Any]:
    total = db.scalar(
        select(func.count(Resource.id)).where(Resource.org_id == org_id)
    ) or 0
    if total == 0:
        return {"total": 0, "note": "No workforce data for this workspace yet."}

    def _group(col):
        stmt = select(col, func.count(Resource.id)).where(Resource.org_id == org_id)
        if args.get("department"):
            stmt = stmt.where(Resource.department == str(args["department"]))
        return {r[0]: r[1] for r in db.execute(stmt.group_by(col)).all() if r[0]}

    where = [Resource.org_id == org_id]
    if args.get("department"):
        where.append(Resource.department == str(args["department"]))

    def _count(*extra):
        return db.scalar(select(func.count(Resource.id)).where(*where, *extra)) or 0

    avg_days = db.scalar(
        select(func.round(func.avg(Resource.days_on_bench))).where(*where)
    ) or 0
    return {
        "total": _count(),
        "deployable": _count(Resource.deployable == "Deployable"),
        "available": _count(Resource.status == "available"),
        "ifb_pipeline": _count(Resource.status == "ifb"),
        "critical_91_plus": _count(Resource.age_bucket == "91+ days"),
        "average_days_on_bench": float(avg_days),
        "by_department": _group(Resource.department),
        "by_age_bucket": _group(Resource.age_bucket),
        "by_location": _group(Resource.location),
    }


def _tool_list_people(db: Session, org_id: int, args: dict[str, Any]) -> dict[str, Any]:
    stmt = select(Resource)
    stmt = _apply_common(stmt, org_id, args)
    if args.get("search"):
        like = f"%{str(args['search'])[:100]}%"
        stmt = stmt.where(
            or_(
                Resource.name.ilike(like),
                Resource.employee_id.ilike(like),
                Resource.skill.ilike(like),
                Resource.department.ilike(like),
                Resource.level.ilike(like),
                Resource.location.ilike(like),
            )
        )
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    limit = _safe_limit(args.get("limit"), 15, MAX_LIST_ROWS)
    rows = db.scalars(
        stmt.order_by(Resource.days_on_bench.desc(), Resource.id.asc()).limit(limit)
    ).all()
    return {
        "total_matching": total,
        "returned": len(rows),
        "people": [
            {
                "name": r.name,
                "employee_id": r.employee_id,
                "department": r.department,
                "skill": r.skill,
                "level": r.level,
                "location": r.location,
                "days_on_bench": r.days_on_bench,
                "age_bucket": r.age_bucket,
                "status": r.status,
                "deployable": r.deployable,
                "hrbp": r.hrbp,
                "leader": r.leader,
            }
            for r in rows
        ],
    }


def _tool_get_skills(db: Session, org_id: int, args: dict[str, Any]) -> dict[str, Any]:
    stmt = (
        select(Resource.skill, func.count(Resource.id).label("n"))
        .where(Resource.org_id == org_id, Resource.skill != "")
    )
    stmt = _apply_common(stmt, org_id, args)
    rows = db.execute(stmt.group_by(Resource.skill).order_by(func.count(Resource.id).desc())).all()
    top = _safe_limit(args.get("limit"), 20, 60)
    return {"skills": [{"skill": r[0], "count": r[1]} for r in rows[:top]], "distinct_skills": len(rows)}


def _tool_get_aging(db: Session, org_id: int, args: dict[str, Any]) -> dict[str, Any]:
    stmt = select(
        Resource.department,
        Resource.age_bucket,
        func.count(Resource.id),
    ).where(Resource.org_id == org_id)
    stmt = _apply_common(stmt, org_id, args)
    rows = db.execute(stmt.group_by(Resource.department, Resource.age_bucket)).all()
    by_dept: dict[str, dict[str, int]] = {}
    for dept, bucket, n in rows:
        by_dept.setdefault(dept, {})[bucket] = n
    return {"by_department": by_dept}


def _tool_get_pipeline(db: Session, org_id: int, args: dict[str, Any]) -> dict[str, Any]:
    stmt = select(Resource.rmg_status, Resource.department, func.count(Resource.id)).where(
        Resource.org_id == org_id, Resource.status == "ifb"
    )
    stmt = _apply_common(stmt, org_id, args)
    rows = db.execute(stmt.group_by(Resource.rmg_status, Resource.department)).all()
    by_status: dict[str, int] = {}
    by_dept: dict[str, int] = {}
    for rmg, dept, n in rows:
        by_status[rmg] = by_status.get(rmg, 0) + n
        by_dept[dept] = by_dept.get(dept, 0) + n
    return {"total_in_pipeline": sum(by_status.values()), "by_rmg_status": by_status, "by_department": by_dept}


def _tool_get_locations(db: Session, org_id: int, args: dict[str, Any]) -> dict[str, Any]:
    stmt = select(Resource.location, func.count(Resource.id)).where(Resource.org_id == org_id)
    stmt = _apply_common(stmt, org_id, args)
    rows = db.execute(stmt.group_by(Resource.location).order_by(func.count(Resource.id).desc())).all()
    return {"locations": [{"location": r[0], "count": r[1]} for r in rows if r[0]]}


def _tool_get_filters(db: Session, org_id: int, args: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, list[str]] = {}
    for field in FILTER_FIELDS:
        col = getattr(Resource, field)
        vals = db.scalars(
            select(distinct(col)).where(Resource.org_id == org_id, col != "").order_by(col).limit(40)
        ).all()
        out[field] = list(vals)
    return out


TOOLS: dict[str, Callable[..., dict[str, Any]]] = {
    "get_overview": _tool_get_overview,
    "list_people": _tool_list_people,
    "get_skill_distribution": _tool_get_skills,
    "get_aging_breakdown": _tool_get_aging,
    "get_pipeline": _tool_get_pipeline,
    "get_location_distribution": _tool_get_locations,
    "get_available_filters": _tool_get_filters,
}

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_overview",
            "description": "Headline KPIs: total people, deployable, available, IFB pipeline, critical 91+ days, average days on bench, plus breakdowns by department, age bucket and location. Use first for 'how many' / summary questions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "department": {"type": "string", "description": "Optional exact department name filter"}
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_people",
            "description": "List individual people (bench resources) with filters. Returns up to 50 rows sorted by most days on bench first, plus total_matching. Use for 'who', 'which people', roster questions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "search": {"type": "string", "description": "Free-text search across name, id, skill, department, level, location"},
                    "department": {"type": "string"},
                    "skill": {"type": "string", "description": "Substring match, e.g. 'Java' or 'Data'"},
                    "status": {"type": "string", "description": "available | ifb | bench"},
                    "deployable": {"type": "string", "description": "Deployable | Non Deployable"},
                    "age_bucket": {"type": "string", "description": "e.g. '0-15 Days', '91+ days'"},
                    "hrbp": {"type": "string"},
                    "leader": {"type": "string"},
                    "location": {"type": "string"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 50, "default": 15},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_skill_distribution",
            "description": "Counts of people per skill (what skills are on bench and how many).",
            "parameters": {
                "type": "object",
                "properties": {
                    "department": {"type": "string"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 60, "default": 20},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_aging_breakdown",
            "description": "Aging buckets (days on bench) per department. Use for aging / tenure / risk questions.",
            "parameters": {"type": "object", "properties": {"department": {"type": "string"}}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_pipeline",
            "description": "IFB pipeline: totals by RMG status (IFB-Selected/Reserved/Shadow etc.) and by department.",
            "parameters": {"type": "object", "properties": {"department": {"type": "string"}}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_location_distribution",
            "description": "Headcount per office location.",
            "parameters": {"type": "object", "properties": {"department": {"type": "string"}}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_available_filters",
            "description": "Exact allowed values for department, skill, status, deployable, age_bucket, hrbp, leader, location. Call when you need exact spelling before filtering.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]


def _system_prompt(org: Organization | None) -> str:
    org_name = org.name if org else "this workspace"
    industry = org.industry if org else "professional"
    unit = (org.unit_label if org else "Resources") or "Resources"
    app_name = (org.app_name if org else "Dashboard") or "Dashboard"
    return (
        f"You are the analytics assistant inside '{app_name}' for {org_name} ({industry} industry). "
        f"You answer questions strictly from LIVE data returned by your tools — never invent numbers, names or percentages.\n"
        f"Rules:\n"
        f"- For any question about headcount, people, skills, aging, pipeline or locations: call the matching tool first, then answer.\n"
        f"- Prefer get_available_filters only when you need exact value spelling; otherwise filter directly.\n"
        f"- Answers must be short (max ~120 words), plain text, no markdown tables. "
        f"Use compact bullet lines like '• name — dept — Nd' when listing people.\n"
        f"- If a filter returns 0 rows, say so and offer a nearby alternative.\n"
        f"- If a tool fails or the question is outside workforce/bench analytics, say you can only answer questions about the {unit.lower()} data in this workspace.\n"
        f"- Reply in the language the user wrote in."
    )


def _execute_tool(name: str, args: dict[str, Any], user: User, db: Session) -> str:
    fn = TOOLS.get(name)
    if not fn:
        return json.dumps({"error": f"Unknown tool: {name}"})
    try:
        clean = {k: v for k, v in (args or {}).items() if v is not None}
        result = fn(db, user.org_id, clean)
        return json.dumps(result, default=str, ensure_ascii=False)
    except Exception:
        logger.exception("Chat tool failed: %s %s", name, args)
        return json.dumps({"error": f"Tool {name} failed"})


def _call_llm(messages: list[dict[str, Any]]) -> dict[str, Any]:
    cfg = get_settings()
    payload: dict[str, Any] = {
        "model": cfg.llm_model,
        "messages": messages,
        "tools": TOOL_SCHEMAS,
        "tool_choice": "auto",
        "temperature": 0.2,
        "max_tokens": cfg.llm_max_tokens,
    }
    try:
        with httpx.Client(timeout=cfg.llm_timeout_seconds) as client:
            resp = client.post(
                f"{cfg.llm_base_url.rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {cfg.llm_api_key}"},
                json=payload,
            )
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="The AI model timed out. Please try again.") from exc
    except httpx.HTTPError as exc:
        logger.exception("LLM request failed")
        raise HTTPException(status_code=502, detail="Could not reach the AI model. Please try again.") from exc

    if resp.status_code in (401, 403):
        raise HTTPException(status_code=502, detail="AI provider rejected the API key. Ask an admin to check LLM_API_KEY.")
    if resp.status_code == 429:
        message = "AI provider rate limit reached. Please wait a moment and retry."
        code = ""
        try:
            err = resp.json().get("error", {})
            message = err.get("message", message) or message
            code = err.get("code", "") or ""
        except Exception:
            pass
        if "quota" in message.lower() or "credit" in message.lower() or code in {"insufficient_quota", "credit_balance_exhausted"}:
            raise HTTPException(
                status_code=502,
                detail="The AI service is out of credit. An admin needs to top up the LLM account balance.",
            )
        raise HTTPException(status_code=429, detail=message)
    if resp.status_code >= 400:
        detail = "The AI model returned an error."
        try:
            detail = resp.json().get("error", {}).get("message", detail)
        except Exception:
            pass
        logger.warning("LLM error %s: %s", resp.status_code, detail)
        raise HTTPException(status_code=502, detail=detail)
    try:
        return resp.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Invalid response from the AI model.") from exc


# ── Endpoint ──────────────────────────────────────────────────────────────────


@chat_router.post("", response_model=ChatResponse)
def chat(
    body: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
) -> ChatResponse:
    cfg = get_settings()
    if not cfg.llm_api_key:
        return ChatResponse(
            reply=(
                "The AI assistant isn't enabled yet. An admin can turn it on by setting "
                "LLM_API_KEY on the API server (optional: LLM_MODEL, LLM_BASE_URL). "
                "Any OpenAI-compatible provider works (OpenAI, OpenRouter, Groq, Ollama…)."
            ),
            configured=False,
        )

    org = db.get(Organization, user.org_id)
    history = [
        {"role": t.role, "content": t.content[:MAX_MESSAGE_LENGTH]}
        for t in body.history[-MAX_HISTORY_MESSAGES:]
        if t.content
    ]
    messages: list[dict[str, Any]] = (
        [{"role": "system", "content": _system_prompt(org)}]
        + history
        + [{"role": "user", "content": body.message.strip()[:MAX_MESSAGE_LENGTH]}]
    )

    tools_used: list[str] = []
    reply = ""

    for _ in range(MAX_TOOL_ROUNDS):
        data = _call_llm(messages)
        try:
            choice = data["choices"][0]["message"]
        except (KeyError, IndexError, TypeError) as exc:
            raise HTTPException(status_code=502, detail="Invalid response from the AI model.") from exc

        tool_calls = choice.get("tool_calls") or []
        if not tool_calls:
            reply = (choice.get("content") or "").strip()
            break

        messages.append(
            {
                "role": "assistant",
                "content": choice.get("content"),
                "tool_calls": tool_calls,
            }
        )
        for tc in tool_calls:
            name = (tc.get("function") or {}).get("name") or ""
            raw_args = (tc.get("function") or {}).get("arguments") or "{}"
            try:
                args = json.loads(raw_args) if isinstance(raw_args, str) else dict(raw_args)
                if not isinstance(args, dict):
                    args = {}
            except json.JSONDecodeError:
                args = {}
            if name:
                tools_used.append(name)
            content = _execute_tool(name, args, user, db)
            messages.append(
                {"role": "tool", "tool_call_id": tc.get("id", ""), "content": content}
            )
    else:
        # Ran out of rounds — ask the model for a final answer without tools.
        data = _call_llm(messages + [{"role": "user", "content": "Give your final short answer now, without calling more tools."}])
        try:
            reply = (data["choices"][0]["message"].get("content") or "").strip()
        except (KeyError, IndexError, TypeError):
            reply = ""

    if not reply:
        reply = "I couldn't produce an answer for that. Please try rephrasing."

    audit(
        db,
        org_id=user.org_id,
        user=user,
        action="chat.message",
        resource="chat",
        detail=f"Chat: {body.message.strip()[:80]}",
        commit=True,
    )
    return ChatResponse(reply=reply, tools_used=tools_used, configured=True)
