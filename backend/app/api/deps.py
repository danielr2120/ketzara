from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import UnauthorizedError
from app.core.security import verify_token
from app.db.session import get_db

DbSession = Annotated[Session, Depends(get_db)]

_bearer = HTTPBearer(auto_error=False)


def require_admin(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]) -> str:
    username = verify_token(get_settings(), credentials.credentials) if credentials else None
    if username is None:
        raise UnauthorizedError("Tu sesión expiró o no es válida. Inicia sesión de nuevo.")
    return username
