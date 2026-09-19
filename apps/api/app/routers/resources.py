from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Resource
from app.schemas import (
    AgingBucketSummary,
    AgingDepartmentRow,
    DesignationCount,
    ExperienceBucket,
    FilterOptions,
    LocationCount,
    PipelineSummary,
    ResourceRead,
    SkillCount,
    SummaryRead,
)

router = APIRouter(prefix="/resources", tags=["resources"])

# ── Input validation helpers ──────────────────────────────────────────────────

MAX_SEARCH_LENGTH = 100
ALLOWED_STATUSES = {"available", "ifb", "bench", ""}
ALLOWED_DEPLOYABLE = {"Deployable", "Non Deployable", ""}


def _validate_search(search: str | None) -> str | None:
    if not search:
        return None
    cleaned = search.strip()[:MAX_SEARCH_LENGTH]
    return cleaned if cleaned else None


def _validate_enum(value: str | None, allowed: set[str], name: str) -> str | None:
    if not value:
        return None
    if value not in allowed:
        raise HTTPException(status_code=422, detail=f"Invalid {name}: {value}")
    return value


# ── LIST / SEARCH ────────────────────────────────────────────────────────────


@router.get("", response_model=list[ResourceRead])
def list_resources(
    search: str | None = Query(default=None, max_length=MAX_SEARCH_LENGTH),
    status: str | None = None,
    deployable: str | None = None,
    department: str | None = Query(default=None, max_length=100),
    skill: str | None = Query(default=None, max_length=100),
    hrbp: str | None = Query(default=None, max_length=50),
    leader: str | None = Query(default=None, max_length=50),
    age_bucket: str | None = Query(default=None, alias="ageBucket", max_length=50),
    db: Session = Depends(get_db),
) -> list[Resource]:
    search = _validate_search(search)
    status = _validate_enum(status, ALLOWED_STATUSES, "status")
    deployable = _validate_enum(deployable, ALLOWED_DEPLOYABLE, "deployable")

    stmt = select(Resource)

    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            or_(
                Resource.name.ilike(like),
                Resource.employee_id.ilike(like),
                Resource.skill.ilike(like),
                Resource.department.ilike(like),
                Resource.location.ilike(like),
                Resource.level.ilike(like),
                Resource.rmg_status.ilike(like),
            )
        )
    if status:
        stmt = stmt.where(Resource.status == status)
    if deployable:
        stmt = stmt.where(Resource.deployable == deployable)
    if department:
        stmt = stmt.where(Resource.department == department)
    if skill:
        stmt = stmt.where(Resource.skill.ilike(f"%{skill}%"))
    if hrbp:
        stmt = stmt.where(Resource.hrbp == hrbp)
    if leader:
        stmt = stmt.where(Resource.leader == leader)
    if age_bucket:
        stmt = stmt.where(Resource.age_bucket == age_bucket)

    stmt = stmt.order_by(Resource.days_on_bench.desc(), Resource.id.asc())
    return list(db.scalars(stmt).all())


@router.get("/{resource_id}", response_model=ResourceRead)
def get_resource(resource_id: int, db: Session = Depends(get_db)) -> Resource:
    resource = db.get(Resource, resource_id)
    if resource is None:
        raise HTTPException(status_code=404, detail="Resource not found")
    return resource


# ── SUMMARY (fully SQL-aggregated) ───────────────────────────────────────────

summary_router = APIRouter(tags=["summary"])


def _apply_filters(stmt, hrbp: str | None, leader: str | None):
    if hrbp:
        stmt = stmt.where(Resource.hrbp == hrbp)
    if leader:
        stmt = stmt.where(Resource.leader == leader)
    return stmt


@summary_router.get("/summary", response_model=SummaryRead)
def get_summary(
    hrbp: str | None = Query(default=None, max_length=50),
    leader: str | None = Query(default=None, max_length=50),
    db: Session = Depends(get_db),
) -> SummaryRead:
    base = _apply_filters(select(Resource), hrbp, leader)

    # Single query for all aggregates
    agg_stmt = select(
        func.count(Resource.id).label("total"),
        func.sum(case((Resource.deployable == "Deployable", 1), else_=0)).label("deployable"),
        func.sum(case((Resource.status == "available", 1), else_=0)).label("available"),
        func.sum(case((Resource.status == "ifb", 1), else_=0)).label("ifb_pipeline"),
        func.sum(case((Resource.age_bucket == "91+ days", 1), else_=0)).label("critical_91_plus"),
        func.round(func.avg(Resource.days_on_bench)).label("avg_days"),
    )
    agg_stmt = _apply_filters(agg_stmt, hrbp, leader)
    row = db.execute(agg_stmt).one()
    total = row.total or 0

    if total == 0:
        return SummaryRead(
            total=0, deployable=0, non_deployable=0, available=0,
            ifb_pipeline=0, critical_91_plus=0, average_days_on_bench=0,
            by_department={}, by_age_bucket={}, by_location={},
        )

    deployable_count = row.deployable or 0

    # Group-by queries
    def _group_by(column):
        stmt = select(column, func.count(Resource.id)).group_by(column)
        stmt = _apply_filters(stmt, hrbp, leader)
        return {r[0]: r[1] for r in db.execute(stmt).all() if r[0]}

    return SummaryRead(
        total=total,
        deployable=deployable_count,
        non_deployable=total - deployable_count,
        available=row.available or 0,
        ifb_pipeline=row.ifb_pipeline or 0,
        critical_91_plus=row.critical_91_plus or 0,
        average_days_on_bench=int(row.avg_days or 0),
        by_department=_group_by(Resource.department),
        by_age_bucket=_group_by(Resource.age_bucket),
        by_location=_group_by(Resource.location),
    )


# ── SKILLS ───────────────────────────────────────────────────────────────────

analytics_router = APIRouter(tags=["analytics"])


@analytics_router.get("/skills", response_model=list[SkillCount])
def get_skills(
    hrbp: str | None = Query(default=None, max_length=50),
    leader: str | None = Query(default=None, max_length=50),
    db: Session = Depends(get_db),
) -> list[SkillCount]:
    stmt = (
        select(Resource.skill, func.count(Resource.id))
        .where(Resource.skill != "")
        .group_by(Resource.skill)
        .order_by(func.count(Resource.id).desc())
    )
    stmt = _apply_filters(stmt, hrbp, leader)
    return [SkillCount(skill=row[0], count=row[1]) for row in db.execute(stmt).all()]


AGING_BUCKETS = ["0-15 Days", "16-30 Days", "31-45 Days", "46-60 Days", "61-90 Days", "91+ days"]


def _risk_label(critical_pct: float) -> str:
    if critical_pct > 20:
        return "High"
    if critical_pct > 10:
        return "Medium"
    return "Low"


@analytics_router.get("/aging", response_model=list[AgingDepartmentRow])
def get_aging(
    hrbp: str | None = Query(default=None, max_length=50),
    leader: str | None = Query(default=None, max_length=50),
    db: Session = Depends(get_db),
) -> list[AgingDepartmentRow]:
    # SQL-aggregated aging by department
    stmt = select(
        Resource.department,
        Resource.age_bucket,
        func.count(Resource.id),
    ).group_by(Resource.department, Resource.age_bucket)
    stmt = _apply_filters(stmt, hrbp, leader)

    depts: dict[str, dict[str, int]] = {}
    dept_totals: dict[str, int] = {}
    for row in db.execute(stmt).all():
        dept, bucket, count = row
        depts.setdefault(dept, {})[bucket] = count
        dept_totals[dept] = dept_totals.get(dept, 0) + count

    result = []
    for dept in sorted(dept_totals, key=lambda d: -dept_totals[d]):
        total = dept_totals[dept]
        buckets = {b: depts.get(dept, {}).get(b, 0) for b in AGING_BUCKETS}
        critical_pct = (buckets.get("91+ days", 0) / total * 100) if total else 0
        result.append(AgingDepartmentRow(
            department=dept, total=total, buckets=buckets, risk=_risk_label(critical_pct),
        ))
    return result


@analytics_router.get("/aging/summary", response_model=list[AgingBucketSummary])
def get_aging_summary(
    hrbp: str | None = Query(default=None, max_length=50),
    leader: str | None = Query(default=None, max_length=50),
    db: Session = Depends(get_db),
) -> list[AgingBucketSummary]:
    stmt = select(Resource.age_bucket, func.count(Resource.id))
    stmt = _apply_filters(stmt, hrbp, leader)
    stmt = stmt.group_by(Resource.age_bucket)

    counts = {row[0]: row[1] for row in db.execute(stmt).all()}
    labels = {
        "0-15 Days": "0–15 Days", "16-30 Days": "16–30 Days",
        "31-45 Days": "31–45 Days", "46-60 Days": "46–60 Days",
        "61-90 Days": "61–90 Days", "91+ days": "91+ Days",
    }
    return [
        AgingBucketSummary(bucket=b, count=counts.get(b, 0), label=labels.get(b, b))
        for b in AGING_BUCKETS
    ]


# ── PIPELINE ─────────────────────────────────────────────────────────────────


@analytics_router.get("/pipeline", response_model=PipelineSummary)
def get_pipeline(
    hrbp: str | None = Query(default=None, max_length=50),
    leader: str | None = Query(default=None, max_length=50),
    db: Session = Depends(get_db),
) -> PipelineSummary:
    base = _apply_filters(select(Resource).where(Resource.status == "ifb"), hrbp, leader)

    agg = select(
        func.sum(case((Resource.rmg_status == "IFB-Selected", 1), else_=0)).label("selected"),
        func.sum(case((Resource.rmg_status == "IFB-Reserved", 1), else_=0)).label("reserved"),
        func.sum(case((Resource.rmg_status == "Available-Pipeline Planned", 1), else_=0)).label("planned"),
        func.sum(case((Resource.rmg_status == "IFB-Shadow", 1), else_=0)).label("shadow"),
    )
    agg = _apply_filters(agg.where(Resource.status == "ifb"), hrbp, leader)
    row = db.execute(agg).one()

    dept_stmt = select(Resource.department, func.count(Resource.id)).where(Resource.status == "ifb").group_by(Resource.department)
    dept_stmt = _apply_filters(dept_stmt, hrbp, leader)
    by_dept = {r[0]: r[1] for r in db.execute(dept_stmt).all()}

    return PipelineSummary(
        ifb_selected=row.selected or 0,
        ifb_reserved=row.reserved or 0,
        pipeline_planned=row.planned or 0,
        ifb_shadow=row.shadow or 0,
        by_department=by_dept,
    )


# ── LOCATIONS ────────────────────────────────────────────────────────────────


@analytics_router.get("/locations", response_model=list[LocationCount])
def get_locations(
    hrbp: str | None = Query(default=None, max_length=50),
    leader: str | None = Query(default=None, max_length=50),
    db: Session = Depends(get_db),
) -> list[LocationCount]:
    stmt = (
        select(Resource.location, func.count(Resource.id))
        .group_by(Resource.location)
        .order_by(func.count(Resource.id).desc())
    )
    stmt = _apply_filters(stmt, hrbp, leader)
    return [LocationCount(location=row[0], count=row[1]) for row in db.execute(stmt).all()]


# ── EXPERIENCE ───────────────────────────────────────────────────────────────


@analytics_router.get("/experience", response_model=list[ExperienceBucket])
def get_experience(
    hrbp: str | None = Query(default=None, max_length=50),
    leader: str | None = Query(default=None, max_length=50),
    db: Session = Depends(get_db),
) -> list[ExperienceBucket]:
    stmt = (
        select(Resource.experience_bucket, func.count(Resource.id))
        .group_by(Resource.experience_bucket)
        .order_by(func.count(Resource.id).desc())
    )
    stmt = _apply_filters(stmt, hrbp, leader)
    return [ExperienceBucket(bucket=row[0], count=row[1]) for row in db.execute(stmt).all()]


# ── DESIGNATIONS ─────────────────────────────────────────────────────────────


@analytics_router.get("/designations", response_model=list[DesignationCount])
def get_designations(
    hrbp: str | None = Query(default=None, max_length=50),
    leader: str | None = Query(default=None, max_length=50),
    db: Session = Depends(get_db),
) -> list[DesignationCount]:
    stmt = (
        select(Resource.level, func.count(Resource.id))
        .group_by(Resource.level)
        .order_by(func.count(Resource.id).desc())
    )
    stmt = _apply_filters(stmt, hrbp, leader)
    return [DesignationCount(level=row[0], count=row[1]) for row in db.execute(stmt).all()]


# ── FILTER OPTIONS ───────────────────────────────────────────────────────────


@analytics_router.get("/filters", response_model=FilterOptions)
def get_filters(db: Session = Depends(get_db)) -> FilterOptions:
    distinct = lambda col: sorted(
        [r[0] for r in db.execute(select(col).distinct()).all() if r[0]]
    )
    return FilterOptions(
        hrbps=distinct(Resource.hrbp),
        leaders=distinct(Resource.leader),
        departments=distinct(Resource.department),
        skills=distinct(Resource.skill),
        statuses=distinct(Resource.status),
        age_buckets=distinct(Resource.age_bucket),
    )
