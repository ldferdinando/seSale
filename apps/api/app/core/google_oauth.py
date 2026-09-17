"""Verificación de ID tokens de Google (login con Google, sin client secret)."""
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.core.config import settings


class GoogleTokenError(ValueError):
    pass


def verify_google_id_token(credential: str) -> dict:
    """Verifica firma, expiración y `aud` (== settings.google_client_id) de un
    ID token emitido por Google Identity Services. Devuelve el payload
    decodificado (incluye `sub`, `email`, `email_verified`, `name`)."""
    if not settings.google_client_id:
        raise GoogleTokenError("Login con Google no está configurado")
    try:
        return id_token.verify_oauth2_token(
            credential, google_requests.Request(), settings.google_client_id
        )
    except ValueError as exc:
        raise GoogleTokenError("Token de Google inválido o expirado") from exc
