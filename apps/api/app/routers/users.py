from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.core.deps import get_current_user, get_session, require_admin
from app.models.user import User
from app.schemas.ad_slot import AdItemWithSlotRead
from app.schemas.user import AdminUserUpdate, UserRead, UserRoleUpdate, UserUpdate, UserVerifiedUpdate
from app.services.ad_service import list_user_banners
from app.services.user_service import (
    get_user,
    list_users,
    update_user,
    update_user_admin,
    update_user_role,
    verify_user,
)

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
async def verify_user_by_id(
    user_id: UUID,
    payload: UserVerifiedUpdate = UserVerifiedUpdate(),
    session: Session = Depends(get_session),
) -> User:
    """Etapa 9d — body opcional (`is_verified`, default True): sin body se
    comporta igual que antes de esta etapa (verifica). Con
    `{"is_verified": false}` revierte la verificación — toggle bidireccional
    para el panel admin."""
    try:
        return verify_user(session, user_id, is_verified=payload.is_verified)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{user_id}/role", response_model=UserRead, dependencies=[Depends(require_admin)])
async def update_user_role_by_id(
    user_id: UUID, payload: UserRoleUpdate, session: Session = Depends(get_session)
) -> User:
    """Etapa 9b — cambiar el rol de un usuario desde el panel admin."""
    try:
        return update_user_role(session, user_id, payload.role)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{user_id}", response_model=UserRead, dependencies=[Depends(require_admin)])
async def update_user_by_id(
    user_id: UUID, payload: AdminUserUpdate, session: Session = Depends(get_session)
) -> User:
    """Etapa 9b — activar/desactivar un usuario desde el panel admin.

    Etapa 11a — BUG 4: ampliado de solo `is_active` a cualquier combinación
    de los campos editables por un admin (`full_name`, `public_name`,
    `city_id`, `doc_type`, `doc_number`, `phone`, `public_whatsapp`,
    `is_active`, `is_verified`, `role`) — `email` queda afuera a propósito.
    `exclude_unset=True` conserva el comportamiento previo: mandar solo
    `{"is_active": false}` sigue funcionando igual que antes."""
    try:
        return update_user_admin(session, user_id, payload.model_dump(exclude_unset=True))
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
