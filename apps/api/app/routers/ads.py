from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from sqlmodel import Session

from app.core.deps import get_session
from app.core.expiry import run_expire_overdue_ad_items_task
from app.core.limiter import limiter
from app.schemas.ad_slot import AdSection, AdSlotRead
from app.services.ad_service import list_public_ad_slots

router = APIRouter(prefix="/api/ads", tags=["ads"])


@router.get("", response_model=list[AdSlotRead])
@limiter.limit("60/minute")
async def get_ads(
    request: Request,
    background_tasks: BackgroundTasks,
    city_id: UUID = Query(...),
    section: AdSection = Query(...),
    category_key: str | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[AdSlotRead]:
    """Público. Slots de una ciudad/sección con sus AdItem vigentes anidados
    (mismo patrón lazy que GET /api/events — ver app/core/expiry.py).

    `category_key` solo importa para section="categoria-wide"/"categoria-grid"
    (Etapa 13b): sin `category_key`, devuelve los slots generales
    (category_key=NULL); con `category_key=<key>`, los de esa categoría
    puntual (lista vacía si no hay, nunca error)."""
    background_tasks.add_task(run_expire_overdue_ad_items_task)
    return list_public_ad_slots(session, city_id=city_id, section=section, category_key=category_key)
