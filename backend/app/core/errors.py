import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger("app")


class AppError(Exception):
    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT


class BusinessRuleError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY


class UnauthorizedError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED


class TooManyRequestsError(AppError):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS


class ServiceUnavailableError(AppError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE


_VALIDATION_MESSAGES = {
    "missing": "Este campo es obligatorio",
    "string_too_short": "Este campo es obligatorio",
    "string_too_long": "El texto es demasiado largo (máximo {max_length} caracteres)",
    "greater_than": "Debe ser mayor que {gt}",
    "greater_than_equal": "Debe ser mayor o igual a {ge}",
    "less_than_equal": "Debe ser menor o igual a {le}",
    "int_parsing": "Debe ser un número entero",
    "int_from_float": "Debe ser un número entero",
    "decimal_parsing": "Debe ser un número válido",
    "decimal_max_places": "Máximo {decimal_places} decimales",
    "decimal_max_digits": "El número es demasiado grande",
    "too_short": "Debe contener al menos {min_length} elemento(s)",
    "date_from_datetime_parsing": "Fecha inválida",
    "date_parsing": "Fecha inválida",
}


def _translate(error: dict) -> str:
    error_type = error.get("type", "")
    ctx = error.get("ctx") or {}
    if error_type == "value_error":
        return str(ctx.get("error", error.get("msg", "Valor inválido")))
    template = _VALIDATION_MESSAGES.get(error_type)
    if template:
        try:
            return template.format(**ctx)
        except (KeyError, IndexError):
            return template
    return "Valor inválido"


def _field_path(loc: tuple) -> str:
    parts = [str(p) for p in loc if p not in ("body", "query", "path")]
    return ".".join(parts)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(_: Request, exc: RequestValidationError):
        errors = [
            {"field": _field_path(tuple(e.get("loc", ()))), "message": _translate(e)}
            for e in exc.errors()
        ]
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": "Hay datos inválidos en la solicitud", "errors": errors},
        )

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(_: Request, exc: IntegrityError):
        logger.warning("Integrity error: %s", exc.orig)
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": "La operación entra en conflicto con datos existentes"},
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(_: Request, exc: Exception):
        logger.exception("Unhandled error", exc_info=exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Ocurrió un error interno. Intenta nuevamente."},
        )
