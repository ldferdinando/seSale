from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True, max_length=255)
    hashed_password: str = Field(max_length=255)
    role: str = Field(default="user")  # "user" | "admin"
    is_active: bool = Field(default=True)

    # Sesión activa (refresh token). Una sola sesión por usuario: el login
    # pisa el hash anterior, el logout lo borra.
    refresh_token_hash: str | None = Field(default=None, max_length=255)
    refresh_token_expires_at: datetime | None = Field(default=None)

    # Datos privados — solo visibles para admin
    full_name: str = Field(max_length=255)
    doc_type: str | None = Field(default=None)  # "dni" | "cuit"
    doc_number: str | None = Field(default=None)
    phone: str | None = Field(default=None)
    phone_verified: bool = Field(default=False)
    email_verified: bool = Field(default=False)

    # Datos públicos — visibles en eventos publicados
    public_name: str = Field(max_length=255)
    public_whatsapp: str | None = Field(default=None)
    city_id: UUID | None = Field(default=None, foreign_key="cities.id")
    is_verified: bool = Field(default=False)

    # None -> el usuario se registró solo. UUID -> el admin que creó la cuenta
    # (flujo de admin creando cuentas para clientes de banner, Etapa 5.6).
    created_by: UUID | None = Field(default=None, foreign_key="users.id")

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    city: "City" = Relationship(back_populates="users")
    organized_events: list["Event"] = Relationship(back_populates="organizer")
    subscriptions: list["Subscription"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"foreign_keys": "[Subscription.user_id]"},
    )
