from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlmodel import Session

from app.core.config import settings
from app.core.deps import get_client_ip, get_current_user, get_session
from app.core.limiter import limiter
from app.models.user import User
from app.schemas.user import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    Token,
    UserLogin,
    UserRead,
    UserRegister,
)
from app.services.auth_service import (
    authenticate_user,
    issue_tokens,
    register_user,
    request_password_reset,
    reset_password,
    revoke_session,
    rotate_refresh_token,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/api/auth"
# Cookie liviana (no HttpOnly) que solo indica "hay una sesión posible", para
# que el frontend evite llamar a /api/auth/refresh cuando ya sabe que no hay
# nada que refrescar (ver api-client.ts::trySilentRefresh). No participa de
# ninguna validación de seguridad: esa sigue dependiendo exclusivamente de
# refresh_token (HttpOnly) y su hash en User.refresh_token_hash.
HAS_SESSION_COOKIE_NAME = "has_session"


def _refresh_cookie_kwargs() -> dict:
    is_dev = settings.environment == "development"
    return {
        "httponly": True,
        "secure": not is_dev,
        "samesite": "lax" if is_dev else "strict",
        "path": REFRESH_COOKIE_PATH,
    }


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    max_age = settings.refresh_token_expire_days * 24 * 3600
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=max_age,
        **_refresh_cookie_kwargs(),
    )
    is_dev = settings.environment == "development"
    response.set_cookie(
        key=HAS_SESSION_COOKIE_NAME,
        value="1",
        max_age=max_age,
        httponly=False,
        secure=not is_dev,
        samesite="lax" if is_dev else "strict",
        path="/",
    )


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour", key_func=get_client_ip)
async def register(request: Request, payload: UserRegister, session: Session = Depends(get_session)) -> User:
    try:
        return register_user(
            session,
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
            doc_type=payload.doc_type,
            doc_number=payload.doc_number,
            phone=payload.phone,
            public_name=payload.public_name,
            public_whatsapp=payload.public_whatsapp,
            city_id=payload.city_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post("/login", response_model=Token)
@limiter.limit("5/minute", key_func=get_client_ip)
async def login(
    request: Request, payload: UserLogin, response: Response, session: Session = Depends(get_session)
) -> Token:
    try:
        user = authenticate_user(session, email=payload.email, password=payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    access_token, refresh_token, expires_in = issue_tokens(session, user)
    _set_refresh_cookie(response, refresh_token)
    return Token(access_token=access_token, expires_in=expires_in)


@router.post("/refresh", response_model=Token)
async def refresh(
    response: Response,
    session: Session = Depends(get_session),
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
) -> Token:
    if refresh_token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sesión inválida")
    try:
        access_token, new_refresh_token, expires_in = rotate_refresh_token(session, refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    _set_refresh_cookie(response, new_refresh_token)
    return Token(access_token=access_token, expires_in=expires_in)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
@limiter.limit("5/hour", key_func=get_client_ip)
async def forgot_password(
    request: Request, payload: ForgotPasswordRequest, session: Session = Depends(get_session)
) -> ForgotPasswordResponse:
    reset_token = request_password_reset(session, email=payload.email)
    message = (
        "Si tu email está registrado, recibirás instrucciones."
        if settings.environment == "staging"
        else "Si tu email está registrado, te enviaremos las instrucciones para recuperar tu contraseña."
    )
    return ForgotPasswordResponse(message=message, reset_token=reset_token)


@router.post("/reset-password", status_code=status.HTTP_200_OK)
@limiter.limit("10/hour", key_func=get_client_ip)
async def reset_password_endpoint(
    request: Request, payload: ResetPasswordRequest, session: Session = Depends(get_session)
) -> dict:
    try:
        reset_password(session, token=payload.token, new_password=payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"detail": "Contraseña actualizada"}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> None:
    revoke_session(session, current_user)
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)
    response.delete_cookie(key=HAS_SESSION_COOKIE_NAME, path="/")
