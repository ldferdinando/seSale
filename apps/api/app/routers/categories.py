from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.core.deps import get_session
from app.schemas.category_catalog import CategoryRead
from app.services.category_catalog_service import list_categories

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryRead])
async def get_categories(session: Session = Depends(get_session)) -> list[CategoryRead]:
    """Categorías activas, ordenadas por sort_order/name — usado por el
    selector de categorías del formulario de evento y los filtros del home."""
    categories = list_categories(session, only_active=True)
    return [CategoryRead.model_validate(c) for c in categories]
