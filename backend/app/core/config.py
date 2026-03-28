"""
VARUNA — Configuration Manager
================================
Loads all settings from environment variables / .env file.
Provides a centralized, type-safe settings object.
"""
from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings


BASE_DIR = Path(__file__).resolve().parents[2]
REPORTS_DIR = BASE_DIR / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


class VarunaSettings(BaseSettings):
    """Centralized settings — loaded from .env + environment variables."""

    # ── JWT ──
    jwt_secret: str = "varuna-hackathon-secret-2026-devhouse-ultra-secure"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # ── API Security ──
    api_key: str = "vr-api-key-devhouse-2026"
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    # ── Rate Limiting ──
    rate_limit: str = "60/minute"
    rate_limit_burst: str = "10/second"

    # ── Demo Credentials ──
    admin_username: str = "varuna_admin"
    admin_password: str = "DevHouse2026$ecure"
    analyst_username: str = "analyst"
    analyst_password: str = "Analyst2026$ecure"

    # ── System ──
    environment: str = "development"
    log_level: str = "INFO"

    model_config = {
        "env_file": str(BASE_DIR / ".env"),
        "env_prefix": "VARUNA_",
        "case_sensitive": False,
        "extra": "ignore",
    }

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = VarunaSettings()
