from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlmodel import Session

from app.core.config import settings
from app.core.deps import get_current_user, get_session
from app.models.user import User
from app.schemas.user import Token, UserLogin, UserRead, UserRegister
from app.services.auth_service import (
    authenticate_user,
    issue_tokens,
    register_user,
    revoke_session,
    rotate_refresh_token,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/api/auth"


def _refresh_cookie_kwargs() -> dict:
    is_dev = settings.environment == "development"
    return {
        "httponly": True,
        "secure": not is_dev,
        "samesite": "lax" if is_dev else "strict",
        "path": REFRESH_COOKIE_PATH,
    }


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=settings.refresh_token_expire_days * 24 * 3600,
        **_refresh_cookie_kwargs(),
    )


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, session: Session = Depends(get_session)) -> User:
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
async def login(payload: UserLogin, response: Response, session: Session = Depends(get_session)) -> Token:
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


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> None:
    revoke_session(session, current_user)
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)
