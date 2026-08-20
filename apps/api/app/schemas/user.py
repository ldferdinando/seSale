from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    # Datos privados
    full_name: str = Field(min_length=1, max_length=255)
    doc_type: str | None = None
    doc_number: str | None = None
    phone: str | None = None

    # Datos públicos
    public_name: str = Field(min_length=1, max_length=255)
    public_whatsapp: str | None = None
    city_id: UUID | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    role: str
    is_active: bool

    full_name: str
    doc_type: str | None
    doc_number: str | None
    phone: str | None
    phone_verified: bool
    email_verified: bool

    public_name: str
    public_whatsapp: str | None
    city_id: UUID | None
    is_verified: bool

    created_at: datetime
    created_by: UUID | None


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = None
    public_name: str | None = Field(default=None, min_length=1, max_length=255)
    public_whatsapp: str | None = None
    city_id: UUID | None = None


class UserAdminRead(BaseModel):
    """Etapa 9b — listado completo de usuarios para el panel admin.

    Extiende UserRead con datos calculados que no viven en el modelo
    `User`: `city_name` (join con `City`) y `event_count` (cantidad de
    eventos creados por este usuario, sin filtrar por status/is_active).
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    role: str
    is_active: bool

    full_name: str
    doc_type: str | None
    doc_number: str | None
    phone: str | None
    phone_verified: bool
    email_verified: bool

    public_name: str
    public_whatsapp: str | None
    city_id: UUID | None
    city_name: str | None
    is_verified: bool

    created_at: datetime
    created_by: UUID | None
    event_count: int


class UserRoleUpdate(BaseModel):
    role: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        if value not in ("user", "admin"):
            raise ValueError("El rol debe ser 'user' o 'admin'")
        return value


class UserActiveUpdate(BaseModel):
    is_active: bool


class UserVerifiedUpdate(BaseModel):
    """Etapa 9d — body opcional de PATCH /api/users/{id}/verify: por defecto
    verifica (True, comportamiento previo a esta etapa, cuando el endpoint
    no aceptaba body); permite también revertir (False) para que el toggle
    del panel admin sea bidireccional."""

    is_verified: bool = True


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    public_name: str = Field(min_length=1, max_length=255)
    full_name: str = Field(min_length=1, max_length=255)
    city_id: UUID | None = None
    role: str = Field(default="user")
    doc_type: str | None = None
    doc_number: str | None = None
    phone: str | None = None
    # Etapa 9d — el admin ya verificó la identidad de esta persona por fuera
    # del sistema (llamada, presencial) antes de cargarla: si es True, la
    # cuenta nace is_verified/is_active/email_verified=True directamente.
    is_verified: bool = False

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        if value not in ("user", "admin"):
            raise ValueError("El rol debe ser 'user' o 'admin'")
        return value


class SetupAdminCreate(BaseModel):
    """Etapa 9d — POST /api/setup/admin. Password más largo que el registro
    normal (mínimo 12, vs. 8 de UserRegister/AdminUserCreate) porque esta
    cuenta nace con rol admin y el endpoint es público mientras no exista
    ningún admin todavía."""

    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    public_name: str = Field(min_length=1, max_length=255)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
