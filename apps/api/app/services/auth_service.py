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
from app.models.user import User


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
