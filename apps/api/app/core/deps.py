from collections.abc import Generator
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, create_engine

from app.core.config import settings
from app.core.security import decode_token
from app.models.user import User

if settings.database_url.startswith("sqlite"):
    engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
else:
    # Los endpoints con DB son `def` y corren en el threadpool de AnyIO (40
    # threads por proceso), así que puede haber varias sesiones a la vez por
    # worker. Conexiones máximas por worker = pool_size + max_overflow (20):
    # multiplicado por WEB_CONCURRENCY (Procfile) tiene que quedar por debajo
    # del max_connections de Postgres, dejando margen para Alembic/psql.
    # statement_timeout (ms) corta cualquier query que se cuelgue en vez de
    # retener la conexión del pool indefinidamente.
    engine = create_engine(
        settings.database_url,
        pool_size=10,
        max_overflow=10,
        pool_pre_ping=True,
        pool_recycle=1800,
        connect_args={"options": "-c statement_timeout=5000"},
    )


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token is None:
        raise credentials_exception
    try:
        payload = decode_token(token, expected_type="access")
    except ValueError:
        raise credentials_exception
    user = session.get(User, UUID(payload["sub"]))
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User | None:
    if token is None:
        return None
    try:
        payload = decode_token(token, expected_type="access")
    except ValueError:
        return None
    user = session.get(User, UUID(payload["sub"]))
    if user is None or not user.is_active:
        return None
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requiere rol admin")
    return user


def get_client_ip(request: Request) -> str | None:
    """IP real del cliente — usa X-Forwarded-For si está presente (Railway
    corre detrás de un proxy en producción), si no cae a request.client.host.

    Se usa tanto para auditoría (Report.ip_address) como key_func del rate
    limit del endpoint de reportes.
    """
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else None
