"""
Corner backend settings. Everything comes from the environment (or a .env file
next to this package). Secrets never have defaults.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent          # backend/backend_server
DEFAULT_DB = BACKEND_DIR.parent / "database" / "data" / "corner.db"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    app_env: Literal["dev", "prod"] = "dev"
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "http://localhost:3000"

    # ── database ─────────────────────────────────────────────
    # SQLite by default. Point this at a Postgres URL (e.g. the Supabase one) and nothing else changes.
    database_url: str = f"sqlite:///{DEFAULT_DB}"

    # ── auth ─────────────────────────────────────────────────
    # "dev": trust X-Dev-User-* headers (Postman, tests). "supabase": verify Supabase JWTs.
    auth_mode: Literal["dev", "supabase"] = "dev"
    supabase_url: str | None = None
    supabase_jwt_secret: str | None = None            # legacy HS256 secret; if unset we use the project's JWKS
    session_secret: str = Field(default="dev-only-change-me")
    session_ttl_hours: int = 24 * 30
    cookie_name: str = "corner_session"
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    # ── agent ────────────────────────────────────────────────
    llm_provider: Literal["gemini", "mock"] = "mock"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    agent_use_tools: bool = True
    agent_history_days: int = 7
    leakcheck_min_span: int = 6                        # consecutive words from the partner's raw text that count as a leak

    # ── nightly job ──────────────────────────────────────────
    scheduler_enabled: bool = True
    analysis_hour: int = 0
    analysis_minute: int = 0
    # previous_day: at 00:00 analyze yesterday. same_day: at e.g. 22:00 analyze today.
    analysis_target: Literal["previous_day", "same_day"] = "previous_day"
    scheduler_poll_minutes: int = 5

    # ── admin ────────────────────────────────────────────────
    admin_token: str = "dev-admin-token"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.database_url.startswith("sqlite:///"):
        Path(s.database_url.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)
    return s
