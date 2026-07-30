from collections.abc import Generator

from fastapi import Header, HTTPException, status
from sqlmodel import Session, create_engine

from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


# La validación del usuario autenticado vía JWT de Supabase llega en la Etapa 3.
# def get_current_user(...) -> User: ...


def require_admin(x_admin_key: str | None = Header(default=None)) -> None:
    """Moderación básica sin auth real (Etapa 2). Se reemplaza por rol admin en Etapa 3."""
    if not settings.admin_key:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Admin key no configurada")
    if x_admin_key != settings.admin_key:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin key inválida")
