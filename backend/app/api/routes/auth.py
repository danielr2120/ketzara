from datetime import datetime

from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, Field

from app.core.config import get_settings
from app.core.errors import ServiceUnavailableError, UnauthorizedError
from app.core.security import auth_configured, check_credentials, create_token, login_throttle

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginIn(BaseModel):
    # Sin str_strip_whitespace: los espacios cuentan en la contraseña.
    model_config = ConfigDict(extra="forbid")

    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=200)


class LoginOut(BaseModel):
    access_token: str
    username: str
    expires_at: datetime


def _client_ip(request: Request) -> str:
    # Render agrega la IP real del visitante al final de X-Forwarded-For.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "desconocida"


@router.post("/login", response_model=LoginOut)
def login(data: LoginIn, request: Request):
    settings = get_settings()
    if not auth_configured(settings):
        raise ServiceUnavailableError(
            "El acceso no está configurado. Define ADMIN_PASSWORD y AUTH_SECRET en el servidor."
        )
    ip = _client_ip(request)
    login_throttle.check(ip)
    username = data.username.strip()
    if not check_credentials(settings, username, data.password):
        login_throttle.record_failure(ip)
        raise UnauthorizedError("Usuario o contraseña incorrectos")
    login_throttle.reset(ip)
    token, expires_at = create_token(settings, username)
    return LoginOut(access_token=token, username=username, expires_at=expires_at)
