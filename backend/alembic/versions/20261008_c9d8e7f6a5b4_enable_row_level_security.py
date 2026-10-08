"""enable row level security

Supabase publica automáticamente las tablas del esquema public en su API REST.
Con RLS activado y sin políticas, esa API no puede leer ni modificar nada; el backend
sigue funcionando porque se conecta como dueño de las tablas.

Revision ID: c9d8e7f6a5b4
Revises: b7c1d2e3f4a5
Create Date: 2026-10-08 16:15:00
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'c9d8e7f6a5b4'
down_revision: Union[str, None] = 'b7c1d2e3f4a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = ("customers", "products", "orders", "order_items")


def upgrade() -> None:
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
