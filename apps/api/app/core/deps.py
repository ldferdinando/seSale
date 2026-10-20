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
    # worker. Conexiones máximas por worker = pool_size + max_overflow:
    # multiplicado por WEB_CONCURRENCY (Procfile) tiene que quedar por debajo
    # del max_connections de Postgres, dejando margen para Alembic/psql.
    # La DB está en Supabase Free (compute t4g.nano): max_connections=60
    # confirmado, con ~15 ya usadas por el propio Supabase con tráfico mínimo.
    # Por eso 5 + 5 = 10 por worker × 2 workers = 20 en total (las
    # BackgroundTasks comparten este mismo pool), y no los 10 + 10 de la guía
    # genérica. Configurable con DB_POOL_SIZE/DB_MAX_OVERFLOW si se sube de
    # compute: recalcular contra el max_connections nuevo.
    # statement_timeout (ms) corta cualquier query que se cuelgue en vez de
    # retener la conexión del pool indefinidamente.
    engine = create_engine(
        settings.database_url,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
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


_UNTRUSTED_FORWARDED_FOR_SENTINEL = "untrusted-direct-access"


def get_client_ip(request: Request) -> str | None:
    """IP real del cliente — usa X-Forwarded-For si está presente (Railway
    corre detrás de un proxy en producción), si no cae a request.client.host.

    Se usa tanto para auditoría (Report.ip_address) como key_func de varios
    rate limits (auth, setup, reportes, gastro, webhooks, client-errors).

    Auditoría post-lanzamiento: quien le pega directo al dominio
    `*.up.railway.app` (en vez de pasar por el rewrite de Vercel) puede
    mandar un X-Forwarded-For falso y saltear el rate limit por IP — Railway
    no publica IPs fijas de proxy para poder validar el hop por ese lado
    (ver a_revisar.md). Si `settings.proxy_shared_secret` está configurado,
    solo se confía en X-Forwarded-For cuando la request trae el header
    `x-sesale-proxy-secret` con ese mismo valor (lo agrega el middleware de
    Next.js antes de la rewrite /api/*, ver apps/web/src/middleware.ts) — sin
    ese valor configurado, el comportamiento es el de siempre (sin cambios).

    Importante: cuando el secreto no matchea, NO cae a `request.client.host`
    — el Procfile corre uvicorn con `--proxy-headers
    --forwarded-allow-ips='*'`, que ya reescribe `request.client` tomando el
    primer valor de X-Forwarded-For (el mismo que acá se rechaza) ANTES de
    que este código corra, así que `request.client.host` está igual de
    envenenado que el header. En vez de confiar en ese valor, se devuelve un
    sentinel fijo: cualquiera que le pegue directo a Railway sin el header
    secreto cae en el mismo balde de rate limit, en vez de uno nuevo por
    cada IP falsa que invente — ver a_revisar.md para el análisis completo
    (la mitigación de fondo requeriría además sacar esos flags del Procfile).
    """
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        if settings.proxy_shared_secret and request.headers.get("x-sesale-proxy-secret") != settings.proxy_shared_secret:
            return _UNTRUSTED_FORWARDED_FOR_SENTINEL
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else None
