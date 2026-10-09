from functools import lru_cache
from pathlib import Path
from zoneinfo import ZoneInfo

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str
    test_database_url: str | None = None

    cors_origins: str = "http://localhost:5173"
    app_timezone: str = "America/Bogota"

    # Acceso a la administración. Sin contraseña o sin secreto nadie puede iniciar sesión.
    admin_username: str = "admin"
    admin_password: str | None = None
    auth_secret: str | None = None

    @field_validator("database_url", "test_database_url")
    @classmethod
    def use_psycopg_driver(cls, url: str | None) -> str | None:
        """Acepta URLs tal como las entrega Supabase u otros proveedores (postgres://...)."""
        if url is None:
            return None
        for prefix in ("postgresql://", "postgres://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url[len(prefix):]
        return url

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def tz(self) -> ZoneInfo:
        return ZoneInfo(self.app_timezone)


@lru_cache
def get_settings() -> Settings:
    return Settings()
