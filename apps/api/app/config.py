from functools import lru_cache

from pydantic_settings import BaseSettings


@lru_cache
def get_settings() -> "Settings":
    return Settings()


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://bench_user:bench_password@localhost:5432/bench_dashboard"
    secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"

    frontend_url: str = "http://localhost:3000"

    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://10.0.2.2:3000",
        "https://project-one-phi-five.vercel.app",
        "https://*.vercel.app",
    ]

    rate_limit_per_minute: int = 120

    api_prefix: str = "/api/v1"
    debug: bool = False

    model_config = {"env_file": ".env", "extra": "ignore"}

    def model_post_init(self, __context) -> None:
        if self.database_url.startswith("postgres://"):
            object.__setattr__(self, "database_url", self.database_url.replace("postgres://", "postgresql+psycopg://", 1))
        elif self.database_url.startswith("postgresql://") and "+psycopg" not in self.database_url:
            object.__setattr__(self, "database_url", self.database_url.replace("postgresql://", "postgresql+psycopg://", 1))
