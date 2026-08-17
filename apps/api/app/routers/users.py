from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.core.deps import get_current_user, get_session, require_admin
from app.models.user import User
from app.schemas.ad_slot import AdItemWithSlotRead
from app.schemas.user import UserRead, UserUpdate
from app.services.ad_service import list_user_banners
from app.services.user_service import get_user, list_users, update_user, verify_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.get("/me/banners", response_model=list[AdItemWithSlotRead])
async def get_my_banners(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[AdItemWithSlotRead]:
    """Etapa 8d — los AdItem del usuario autenticado (anunciante), vigentes y
    futuros, solo lectura. Ordenados por starts_at DESC."""
    return list_user_banners(session, current_user.id)


@router.put("/me", response_model=UserRead)
async def update_me(
    payload: UserUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> User:
    return update_user(session, current_user, payload.model_dump(exclude_unset=True))


@router.get("", response_model=list[UserRead], dependencies=[Depends(require_admin)])
async def list_all_users(
    session: Session = Depends(get_session),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[User]:
    return list_users(session, limit=limit, offset=offset)


@router.get("/{user_id}", response_model=UserRead, dependencies=[Depends(require_admin)])
async def get_user_by_id(user_id: UUID, session: Session = Depends(get_session)) -> User:
    try:
        return get_user(session, user_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{user_id}/verify", response_model=UserRead, dependencies=[Depends(require_admin)])
async def verify_user_by_id(user_id: UUID, session: Session = Depends(get_session)) -> User:
    try:
        return verify_user(session, user_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
