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

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        if value not in ("user", "admin"):
            raise ValueError("El rol debe ser 'user' o 'admin'")
        return value


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
