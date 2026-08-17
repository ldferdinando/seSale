from datetime import date, datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel


class AdItem(SQLModel, table=True):
    """Pieza publicitaria — una imagen con su link y vigencia, cargada por el
    admin para un anunciante (usuario registrado) específico. Vive dentro de
    un AdSlot (el espacio/posición fija en la página)."""

    __tablename__ = "ad_items"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    slot_id: UUID = Field(foreign_key="ad_slots.id", index=True)

    # Anunciante — siempre un usuario registrado, elegido por el admin al cargar el banner.
    user_id: UUID = Field(foreign_key="users.id", index=True)

    # Contenido de la pieza
    img_url: str = Field(max_length=500)
    link_url: str | None = Field(default=None, max_length=500)
    alt_text: str | None = Field(default=None, max_length=255)

    # Nombre del anunciante para mostrar en el panel admin y en la vista del
    # usuario. Se copia de User.public_name al crear si no se especifica,
    # para no necesitar el join siempre.
    advertiser_name: str | None = Field(default=None, max_length=255)

    # Vigencia
    starts_at: date = Field(
        default_factory=lambda: datetime.now(timezone.utc).date()
    )
    ends_at: date | None = Field(default=None)  # None = vigente indefinidamente

    # Estado — "active" | "paused" | "expired". Sin "pending": el admin carga
    # y activa directamente, no hay flujo de aprobación.
    status: str = Field(default="active", max_length=20)

    # Orden dentro del slot. Solo tiene efecto cuando el AdSlot es
    # rotation_mode="sequential" (se ignora en "random").
    display_order: int = Field(default=0)

    # Auditoría — admin que cargó este banner (siempre un admin, nunca el anunciante).
    created_by: UUID = Field(foreign_key="users.id")

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relaciones
    slot: "AdSlot" = Relationship(back_populates="items")
    user: "User" = Relationship(
        back_populates="ad_items",
        sa_relationship_kwargs={"foreign_keys": "[AdItem.user_id]"},
    )
    creator: "User" = Relationship(
        back_populates="created_ad_items",
        sa_relationship_kwargs={"foreign_keys": "[AdItem.created_by]"},
    )
