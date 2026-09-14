from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from sqlmodel import Session

from app.core.config import settings
from app.core.deps import get_client_ip, get_session
from app.core.email import send_location_report_email
from app.core.expiry import run_expire_overdue_gastro_plans_task
from app.core.limiter import limiter
from app.models.location import Location
from app.schemas.location import LocationGastroRead
from app.schemas.report import ReportCreate, ReportRead
from app.services.location_service import get_gastro_place, list_public_gastro_places
from app.services.report_service import create_location_report

router = APIRouter(prefix="/api/gastro", tags=["gastro"])


@router.get("", response_model=list[LocationGastroRead])
@limiter.limit("60/minute")
async def get_gastro_places(
    request: Request,
    background_tasks: BackgroundTasks,
    city_id: UUID = Query(...),
    gastro_type: str | None = Query(default=None),
    search: str | None = Query(default=None),
    has_delivery: bool | None = Query(default=None),
    has_reservations: bool | None = Query(default=None),
    price_range: str | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[LocationGastroRead]:
    """Público. Lugares gastronómicos de una ciudad (is_gastro, is_active,
    is_public). Mismo patrón lazy de vencimiento que GET /api/events —
    ver app/core/expiry.py."""
    background_tasks.add_task(run_expire_overdue_gastro_plans_task)
    return list_public_gastro_places(
        session,
        city_id=city_id,
        gastro_type=gastro_type,
        search=search,
        has_delivery=has_delivery,
        has_reservations=has_reservations,
        price_range=price_range,
    )


@router.get("/{location_id}", response_model=LocationGastroRead)
@limiter.limit("60/minute")
async def get_gastro_place_detail(
    request: Request,
    location_id: UUID,
    session: Session = Depends(get_session),
) -> LocationGastroRead:
    try:
        return get_gastro_place(session, location_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/{location_id}/report", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/hour", key_func=get_client_ip)
async def post_gastro_place_report(
    request: Request,
    location_id: UUID,
    payload: ReportCreate,
    session: Session = Depends(get_session),
) -> ReportRead:
    """Público — mismo patrón que POST /api/events/{id}/report (Etapa 6.5):
    rate limit por IP + notificación por email al admin."""
    try:
        report = create_location_report(
            session,
            location_id=location_id,
            text=payload.text,
            contact_phone=payload.contact_phone,
            ip_address=get_client_ip(request),
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    location = session.get(Location, location_id)
    location_url = f"{settings.frontend_url}/lugares/{location_id}"
    if location is not None:
        await send_location_report_email(
            location_name=location.name,
            location_id=location_id,
            report_text=payload.text,
            contact_phone=payload.contact_phone,
            location_url=location_url,
        )

    return report
