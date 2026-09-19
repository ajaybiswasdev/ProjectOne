import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.middleware import RateLimitMiddleware, SecurityHeadersMiddleware
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
    allow_origins=settings.cors_origins,
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


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(resources_router, prefix=settings.api_prefix)
app.include_router(summary_router, prefix=settings.api_prefix)
app.include_router(analytics_router, prefix=settings.api_prefix)
