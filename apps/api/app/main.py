import json
import logging
import time
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.middleware import RateLimitMiddleware, SecurityHeadersMiddleware
from app.models import Resource
from app.routers.resources import analytics_router, router as resources_router, summary_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title="Bench Management API",
    version="1.0.0",
    description="Production API for the Bench Management Dashboard.",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
)

# ── Middleware (order matters: outermost = first applied) ─────────────────────
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware, max_requests=settings.rate_limit_per_minute)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


# ── Request timing ────────────────────────────────────────────────────────────
@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
    response.headers["X-Response-Time"] = f"{elapsed_ms}ms"
    if elapsed_ms > 1000:
        logger.warning("Slow request: %s %s took %sms", request.method, request.url.path, elapsed_ms)
    return response


# ── Global error handler ──────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/api/v1/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": "1.0.0"}


# ── Auto-setup: create tables + seed data on first start ──────────────────────
@app.on_event("startup")
def auto_setup():
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/verified")

        data_file = Path(__file__).parent / "seed_data" / "resources.json"
        if not data_file.exists():
            logger.warning("Seed data file not found: %s", data_file)
            return

        with SessionLocal() as db:
            from sqlalchemy import func
            count = db.query(func.count(Resource.id)).scalar()
            if count and count > 0:
                logger.info("Database already has %d resources, skipping seed", count)
                return

        from sqlalchemy.dialects.postgresql import insert
        rows = json.loads(data_file.read_text(encoding="utf-8"))
        payload = []
        for row in rows:
            payload.append({
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
            })

        with SessionLocal() as db:
            stmt = insert(Resource).values(payload)
            update_cols = {
                column.name: getattr(stmt.excluded, column.name)
                for column in Resource.__table__.columns
                if column.name != "id"
            }
            db.execute(stmt.on_conflict_do_update(index_elements=["id"], set_=update_cols))
            db.commit()
        logger.info("Seeded %d resources", len(payload))
    except Exception:
        logger.exception("Auto-setup failed")


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(resources_router, prefix=settings.api_prefix)
app.include_router(summary_router, prefix=settings.api_prefix)
app.include_router(analytics_router, prefix=settings.api_prefix)
