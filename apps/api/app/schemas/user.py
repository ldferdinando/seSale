from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


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


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = None
    public_name: str | None = Field(default=None, min_length=1, max_length=255)
    public_whatsapp: str | None = None
    city_id: UUID | None = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
