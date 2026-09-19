from functools import lru_cache

from pydantic_settings import BaseSettings


@lru_cache
def get_settings() -> "Settings":
    return Settings()


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str = "postgresql+psycopg://bench_user:bench_password@localhost:5432/bench_dashboard"

    # ── CORS ──────────────────────────────────────────────────────────────────
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://10.0.2.2:3000",
    ]

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    rate_limit_per_minute: int = 120

    # ── API ───────────────────────────────────────────────────────────────────
    api_prefix: str = "/api/v1"
    debug: bool = False

    model_config = {"env_prefix": "BENCH_", "env_file": ".env", "extra": "ignore"}
