import time
from collections import defaultdict

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimitMiddleware(BaseHTTPMiddleware):
    """In-memory rate limiter: per-org when JWT present, else per-IP."""

    def __init__(self, app, max_requests: int = 120, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)
        self.org_limits: dict[int, int] = {}
        self.org_limits_loaded_at = 0.0

    def _refresh_org_limits(self) -> None:
        if time.time() - self.org_limits_loaded_at < 60:
            return
        self.org_limits_loaded_at = time.time()
        try:
            from app.database import SessionLocal
            from app.models import Organization

            with SessionLocal() as db:
                self.org_limits = {
                    org.id: org.rate_limit
                    for org in db.query(Organization).all()
                    if org.rate_limit
                }
        except Exception:
            pass

    def _rate_key_and_limit(self, request: Request) -> tuple[str, int]:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            try:
                from jose import jwt

                from app.config import get_settings

                payload = jwt.decode(
                    auth[7:],
                    get_settings().secret_key,
                    algorithms=["HS256"],
                )
                org = payload.get("org")
                if org is not None:
                    self._refresh_org_limits()
                    limit = self.org_limits.get(int(org), self.max_requests)
                    return f"org:{org}", limit
            except Exception:
                pass
        client_ip = request.client.host if request.client else "unknown"
        return f"ip:{client_ip}", self.max_requests

    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith("/docs") or request.url.path.startswith("/openapi"):
            return await call_next(request)

        key, max_requests = self._rate_key_and_limit(request)
        now = time.time()
        cutoff = now - self.window_seconds

        self.requests[key] = [t for t in self.requests[key] if t > cutoff]

        if len(self.requests[key]) >= max_requests:
            return Response(
                content='{"detail":"Rate limit exceeded. Try again later."}',
                status_code=429,
                media_type="application/json",
            )

        self.requests[key].append(now)
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if not request.url.path.startswith("/docs") and not request.url.path.startswith("/openapi"):
            response.headers["Cache-Control"] = "private, max-age=30"
        return response
