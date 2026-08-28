"""add_contact_facebook_to_events

Revision ID: a2b3c4d5e6f7
Revises: f5a6b7c8d9e0
Create Date: 2026-08-25 10:15:00.000000

Etapa 12a — nuevo campo de contacto opcional `Event.contact_facebook`, para
que el organizador pueda cargar el link/nombre de página de Facebook del
evento (mismo patrón que contact_whatsapp/contact_instagram/contact_web/
contact_email, todos opcionales y nullable).
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a2b3c4d5e6f7"
down_revision: Union[str, None] = "f5a6b7c8d9e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.add_column(sa.Column("contact_facebook", sa.String(length=500), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.drop_column("contact_facebook")
