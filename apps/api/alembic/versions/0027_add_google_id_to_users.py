"""add_google_id_to_users

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-09-16 10:00:00.000000

Etapa "Login con Google (OAuth)" — agrega `google_id` (nullable, único) a
`users` para vincular una cuenta con el `sub` del ID token de Google.
Usuarios existentes (creados por email/password) quedan con `google_id`
NULL hasta que inicien sesión con Google por primera vez, momento en el que
`auth_service.authenticate_google_user` vincula la cuenta existente por
email (ver app/services/auth_service.py).
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f7a8b9c0d1e2"
down_revision: Union[str, None] = "e6f7a8b9c0d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("google_id", sa.String(length=255), nullable=True))
        batch_op.create_index(op.f("ix_users_google_id"), ["google_id"], unique=True)


def downgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_index(op.f("ix_users_google_id"))
        batch_op.drop_column("google_id")
