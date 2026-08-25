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
    """PUT /api/users/me — el propio usuario edita sus datos. `email`, `role`
    e `is_verified` quedan afuera a propósito: `email` es el identificador
    (no se cambia), `role`/`is_verified` solo los puede tocar un admin (ver
    `AdminUserUpdate`)."""

    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = None
    # Etapa 11a — BUG 5: faltaban en el schema (el modelo y el registro ya
    # los tenían) — sin esto, `/mi-cuenta` no podía editar el documento.
    doc_type: str | None = None
    doc_number: str | None = None
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


class AdminUserUpdate(BaseModel):
    """Etapa 11a — BUG 4: PATCH /api/users/{id}, admin-only. Todos los
    campos son opcionales (`exclude_unset` en el service) — el admin puede
    mandar solo los que cambió. `email` queda afuera a propósito (es el
    identificador, no se edita). `role`/`is_active`/`is_verified` ya tenían
    endpoints dedicados (`.../role`, este mismo PATCH antes solo aceptaba
    is_active, `.../verify`) — se incluyen acá también para poder editarlos
    junto con el resto en un solo request desde el formulario de edición."""

    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    public_name: str | None = Field(default=None, min_length=1, max_length=255)
    city_id: UUID | None = None
    doc_type: str | None = None
    doc_number: str | None = None
    phone: str | None = None
    public_whatsapp: str | None = None
    is_active: bool | None = None
    is_verified: bool | None = None
    role: str | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str | None) -> str | None:
        if value is not None and value not in ("user", "admin"):
            raise ValueError("El rol debe ser 'user' o 'admin'")
        return value


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


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    """Respuesta siempre 200, mismo mensaje exista o no el email (no revela
    si una cuenta existe). `reset_token` solo viaja en `environment ==
    "staging"` — ver `auth_service.request_password_reset`; en producción
    queda `None` (se mandaría por email cuando Resend esté configurado)."""

    message: str
    reset_token: str | None = None


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)
