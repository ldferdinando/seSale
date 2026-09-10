from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.core.deps import get_session
from app.schemas.category_catalog import CategoryRead
from app.services.category_catalog_service import count_future_events_by_category, list_categories

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryRead])
async def get_categories(session: Session = Depends(get_session)) -> list[CategoryRead]:
    """Categorías activas, ordenadas por sort_order/name — usado por el
    selector de categorías del formulario de evento y los filtros del home."""
    categories = list_categories(session, only_active=True)
    return [CategoryRead.model_validate(c) for c in categories]


@router.get("/counts", response_model=dict[str, int])
async def get_category_counts(
    city_id: UUID = Query(...),
    session: Session = Depends(get_session),
) -> dict[str, int]:
    """Cantidad de eventos aprobados, activos y futuros (``date >= hoy`` en hora
    Argentina) por categoría activa, para la ciudad dada. Una entrada por
    categoría activa (``0`` incluido). Usado por la grilla de ``/categorias``
    (Etapa 13a)."""
    return count_future_events_by_category(session, city_id)
