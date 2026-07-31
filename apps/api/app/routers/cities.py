from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.core.deps import get_session
from app.models.city import City
from app.schemas.city import CityRead
from app.services.city_service import list_active_cities

router = APIRouter(prefix="/api/cities", tags=["cities"])


@router.get("", response_model=list[CityRead])
async def list_cities(session: Session = Depends(get_session)) -> list[City]:
    return list_active_cities(session)
