import hashlib
import hmac
import threading
import time
from collections import deque
from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import Settings
from app.core.errors import TooManyRequestsError

TOKEN_TTL = timedelta(days=7)
ALGORITHM = "HS256"


def auth_configured(settings: Settings) -> bool:
    return bool(settings.admin_password and settings.auth_secret)


def _signing_key(settings: Settings) -> bytes:
    # Incluye la contraseña: al cambiarla, todas las sesiones abiertas dejan de valer.
    return hmac.new(
        settings.auth_secret.encode(), settings.admin_password.encode(), hashlib.sha256  # type: ignore[union-attr]
    ).digest()


def check_credentials(settings: Settings, username: str, password: str) -> bool:
    if not auth_configured(settings):
        return False
    valid_user = hmac.compare_digest(username.encode(), settings.admin_username.encode())
    valid_password = hmac.compare_digest(password.encode(), settings.admin_password.encode())  # type: ignore[union-attr]
    return valid_user and valid_password


def create_token(settings: Settings, username: str) -> tuple[str, datetime]:
    expires_at = datetime.now(timezone.utc) + TOKEN_TTL
    token = jwt.encode({"sub": username, "exp": expires_at}, _signing_key(settings), algorithm=ALGORITHM)
    return token, expires_at


def verify_token(settings: Settings, token: str) -> str | None:
    """Devuelve el usuario del token, o None si es inválido, expiró o el usuario cambió."""
    if not auth_configured(settings):
        return None
    try:
        payload = jwt.decode(token, _signing_key(settings), algorithms=[ALGORITHM], options={"require": ["exp", "sub"]})
    except jwt.PyJWTError:
        return None
    return payload["sub"] if payload["sub"] == settings.admin_username else None


class LoginThrottle:
    """Bloquea temporalmente una IP tras varios intentos fallidos (en memoria, por proceso)."""

    def __init__(self, max_failures: int = 10, window_seconds: int = 15 * 60):
        self.max_failures = max_failures
        self.window_seconds = window_seconds
        self._failures: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def _recent(self, key: str, now: float) -> deque[float]:
        attempts = self._failures.setdefault(key, deque())
        while attempts and now - attempts[0] > self.window_seconds:
            attempts.popleft()
        return attempts

    def check(self, key: str) -> None:
        with self._lock:
            if len(self._recent(key, time.monotonic())) >= self.max_failures:
                raise TooManyRequestsError("Demasiados intentos fallidos. Espera unos minutos e intenta de nuevo.")

    def record_failure(self, key: str) -> None:
        with self._lock:
            now = time.monotonic()
            self._recent(key, now).append(now)

    def reset(self, key: str | None = None) -> None:
        with self._lock:
            if key is None:
                self._failures.clear()
            else:
                self._failures.pop(key, None)


login_throttle = LoginThrottle()
