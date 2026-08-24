from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class PasswordResetToken(SQLModel, table=True):
    """Token temporal de recuperación de contraseña (Etapa 10e).

    Flujo sin envío de email real todavía (Resend no está configurado): el
    token se devuelve en la respuesta de `POST /api/auth/forgot-password`
    solo cuando `settings.environment == "staging"` — ver
    `auth_service.request_password_reset`. En producción no se expone (se
    mandaría por email cuando Resend esté disponible).
    """

    __tablename__ = "password_reset_tokens"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    token: str = Field(unique=True, index=True, max_length=64)
    expires_at: datetime
    used_at: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
