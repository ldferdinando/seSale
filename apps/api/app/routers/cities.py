from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.deps import get_session, require_admin
from app.models.city import City
from app.schemas.city import CityRead
from app.services.city_service import list_active_cities, toggle_city_active

router = APIRouter(prefix="/api/cities", tags=["cities"])


@router.get("", response_model=list[CityRead])
async def list_cities(session: Session = Depends(get_session)) -> list[City]:
    return list_active_cities(session)


@router.patch("/{city_id}/toggle", response_model=CityRead, dependencies=[Depends(require_admin)])
async def patch_city_toggle(city_id: UUID, session: Session = Depends(get_session)) -> City:
    try:
        return toggle_city_active(session, city_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
