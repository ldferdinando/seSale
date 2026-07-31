"""Utilidades de auth: hashing de passwords y JWT propio (Etapa 3)."""
import hashlib
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def _create_token(subject: UUID, role: str, token_type: str, expires_delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject),
        "role": role,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
        # jti evita que dos tokens emitidos en el mismo segundo (con el mismo
        # payload) sean strings idénticas, algo relevante para la rotación de
        # refresh tokens en /api/auth/refresh.
        "jti": str(uuid4()),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_access_token(subject: UUID, role: str) -> str:
    return _create_token(subject, role, "access", timedelta(minutes=settings.access_token_expire_minutes))


def create_refresh_token(subject: UUID, role: str) -> str:
    return _create_token(subject, role, "refresh", timedelta(days=settings.refresh_token_expire_days))


def decode_token(token: str, expected_type: str) -> dict:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError as exc:
        raise ValueError("Token inválido o expirado") from exc
    if payload.get("type") != expected_type:
        raise ValueError(f"Se esperaba un token de tipo {expected_type}")
    return payload


def hash_refresh_token(raw_token: str) -> str:
    # sha256 (no bcrypt): el refresh token ya es de alta entropía, no una
    # password humana débil. bcrypt sería más lento sin ganancia real y además
    # trunca su input a 72 bytes, lo que rompería la comparación con un JWT.
    return hashlib.sha256(raw_token.encode()).hexdigest()
