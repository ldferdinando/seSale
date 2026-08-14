from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlmodel import Session

from app.core.deps import get_session
from app.core.limiter import limiter
from app.schemas.location import LocationRead
from app.services.location_service import get_location, list_public_locations

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.get("", response_model=list[LocationRead])
@limiter.limit("60/minute")
async def get_locations(
    request: Request,
    city_id: UUID = Query(...),
    search: str | None = Query(default=None),
    place_type: str | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[LocationRead]:
    return list_public_locations(session, city_id=city_id, search=search, place_type=place_type)


@router.get("/{location_id}", response_model=LocationRead)
@limiter.limit("60/minute")
async def get_location_detail(
    request: Request,
    location_id: UUID,
    session: Session = Depends(get_session),
) -> LocationRead:
    try:
        return get_location(session, location_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
