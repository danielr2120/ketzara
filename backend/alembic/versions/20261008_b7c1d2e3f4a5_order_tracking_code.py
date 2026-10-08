"""order tracking code

Revision ID: b7c1d2e3f4a5
Revises: 0a38b6bfeda5
Create Date: 2026-10-08 15:55:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b7c1d2e3f4a5'
down_revision: Union[str, None] = '0a38b6bfeda5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('tracking_code', sa.String(length=32), nullable=True))
    op.execute(
        "UPDATE orders SET tracking_code = "
        "substr(md5(random()::text || clock_timestamp()::text || id::text), 1, 16)"
    )
    op.alter_column('orders', 'tracking_code', nullable=False)
    op.create_unique_constraint(op.f('uq_orders_tracking_code'), 'orders', ['tracking_code'])


def downgrade() -> None:
    op.drop_constraint(op.f('uq_orders_tracking_code'), 'orders', type_='unique')
    op.drop_column('orders', 'tracking_code')
