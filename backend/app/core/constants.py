"""Catálogos simples de la aplicación.

Para agregar un nuevo método de pago o estado basta con añadir una entrada
aquí: el backend lo valida y el frontend lo obtiene desde GET /api/meta.
"""

PAYMENT_METHODS: dict[str, str] = {
    "cash": "Efectivo",
    "transfer": "Transferencia",
    "nequi": "Nequi",
    "daviplata": "Daviplata",
    "other": "Otro",
}

ORDER_STATUSES: dict[str, str] = {
    "pending": "Pendiente",
    "confirmed": "Confirmado",
    "preparing": "Preparando",
    "shipped": "Enviado",
    "delivered": "Entregado",
    "cancelled": "Cancelado",
}

DEFAULT_ORDER_STATUS = "pending"
CANCELLED_STATUS = "cancelled"
DELIVERED_STATUS = "delivered"

ORDER_NUMBER_PREFIX = "PED-"
ORDER_NUMBER_DIGITS = 6


def format_order_number(sequence_value: int) -> str:
    return f"{ORDER_NUMBER_PREFIX}{sequence_value:0{ORDER_NUMBER_DIGITS}d}"
