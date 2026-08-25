import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlmodel import Session, select

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User

# Etapa 10e — vida del token de recuperación de contraseña.
PASSWORD_RESET_TOKEN_EXPIRE_HOURS = 1


def register_user(
    session: Session,
    *,
    email: str,
    password: str,
    full_name: str,
    doc_type: str | None,
    doc_number: str | None,
    phone: str | None,
    public_name: str,
    public_whatsapp: str | None,
    city_id: UUID | None,
) -> User:
    existing = session.exec(select(User).where(User.email == email)).first()
    if existing is not None:
        raise ValueError("El email ya está registrado")

    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        doc_type=doc_type,
        doc_number=doc_number,
        phone=phone,
        public_name=public_name,
        public_whatsapp=public_whatsapp,
        city_id=city_id,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def authenticate_user(session: Session, *, email: str, password: str) -> User:
    user = session.exec(select(User).where(User.email == email)).first()
    if user is None or not verify_password(password, user.hashed_password) or not user.is_active:
        raise ValueError("Credenciales inválidas")
    return user


def issue_tokens(session: Session, user: User) -> tuple[str, str, int]:
    """Emite un access+refresh token y persiste el hash del refresh (sesión única)."""
    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id, user.role)

    user.refresh_token_hash = hash_refresh_token(refresh_token)
    user.refresh_token_expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.refresh_token_expire_days
    )
    session.add(user)
    session.commit()

    return access_token, refresh_token, settings.access_token_expire_minutes * 60


def rotate_refresh_token(session: Session, raw_refresh_token: str) -> tuple[str, str, int]:
    """Valida un refresh token y emite un nuevo par de tokens (rotación)."""
    try:
        payload = decode_token(raw_refresh_token, expected_type="refresh")
    except ValueError as exc:
        raise ValueError("Sesión inválida") from exc

    user = session.get(User, UUID(payload["sub"]))
    if user is None or not user.is_active:
        raise ValueError("Sesión inválida")
    if user.refresh_token_hash != hash_refresh_token(raw_refresh_token):
        raise ValueError("Sesión inválida")

    expires_at = user.refresh_token_expires_at
    if expires_at is not None:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise ValueError("Sesión inválida")

    return issue_tokens(session, user)


def revoke_session(session: Session, user: User) -> None:
    user.refresh_token_hash = None
    user.refresh_token_expires_at = None
    session.add(user)
    session.commit()


@dataclass
class PasswordResetRequestResult:
    """Etapa 11a — el router necesita el usuario (para armar el email) y el
    token crudo (para el link/`reset_token` de debug), pero solo cuando el
    email SÍ está registrado — `user`/`raw_token` quedan `None` si no
    (mismo criterio anti-enumeración de siempre)."""

    user: User | None
    raw_token: str | None


def request_password_reset(session: Session, *, email: str) -> PasswordResetRequestResult:
    """Genera un token de recuperación si el email existe, sin revelarlo.

    El router decide, con esto, si envía el email real (Resend configurado)
    y/o si expone el `reset_token` de debug (staging sin Resend) — esta
    función no sabe nada de eso, solo genera y persiste el token.
    """
    user = session.exec(select(User).where(User.email == email)).first()
    if user is None or not user.is_active:
        return PasswordResetRequestResult(user=None, raw_token=None)

    # Etapa 11a: invalidar cualquier token anterior sin usar del mismo
    # usuario — pedir "olvidé mi contraseña" dos veces no debe dejar dos
    # tokens válidos circulando (el más viejo, ya enviado a una bandeja de
    # entrada previa, sigue siendo utilizable hasta su expiración si no se
    # hace esto).
    now = datetime.now(timezone.utc)
    previous_tokens = session.exec(
        select(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None)
        )
    ).all()
    for previous in previous_tokens:
        previous.used_at = now
        session.add(previous)

    # secrets.token_urlsafe(32) — criptográficamente seguro y no predecible
    # (usa os.urandom), ~43 caracteres URL-safe, entra en `token: str =
    # Field(max_length=64)` de PasswordResetToken.
    raw_token = secrets.token_urlsafe(32)
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=raw_token,
        expires_at=now + timedelta(hours=PASSWORD_RESET_TOKEN_EXPIRE_HOURS),
    )
    session.add(reset_token)
    session.commit()

    return PasswordResetRequestResult(user=user, raw_token=raw_token)


def reset_password(session: Session, *, token: str, new_password: str) -> None:
    """Valida el token (existe, no usado, no expirado) y cambia la password.

    A diferencia de `authenticate_user`/`request_password_reset`, acá SÍ
    conviene distinguir el motivo del rechazo en el mensaje (token
    inválido/expirado vs ya usado) porque quien llega con un `token` en la
    URL ya demostró tener acceso a él — no hay nada que "no revelar".
    """
    reset_token = session.exec(select(PasswordResetToken).where(PasswordResetToken.token == token)).first()
    if reset_token is None:
        raise ValueError("El token de recuperación no es válido")
    if reset_token.used_at is not None:
        raise ValueError("El token de recuperación ya fue utilizado")

    expires_at = reset_token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise ValueError("El token de recuperación expiró")

    user = session.get(User, reset_token.user_id)
    if user is None or not user.is_active:
        raise ValueError("El token de recuperación no es válido")

    user.hashed_password = hash_password(new_password)
    # Cambiar la password invalida cualquier sesión activa — mismo criterio
    # que un logout forzado, evita que una sesión robada sobreviva al reset.
    user.refresh_token_hash = None
    user.refresh_token_expires_at = None
    reset_token.used_at = datetime.now(timezone.utc)

    session.add(user)
    session.add(reset_token)
    session.commit()
