from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.core.deps import get_session
from app.schemas.gastro_type_catalog import GastroTypeRead
from app.services.gastro_type_catalog_service import list_gastro_types

router = APIRouter(prefix="/api/gastro-types", tags=["gastro-types"])


@router.get("", response_model=list[GastroTypeRead])
async def get_gastro_types(session: Session = Depends(get_session)) -> list[GastroTypeRead]:
    """Tipos gastronómicos activos, ordenados por sort_order/name — usado por
    los chips de filtro de /lugares y el ABM de gastronomía del admin."""
    gastro_types = list_gastro_types(session, only_active=True)
    return [GastroTypeRead.model_validate(t) for t in gastro_types]
