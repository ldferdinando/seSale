from datetime import date
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, Request, UploadFile, status
from sqlmodel import Session

from app.core.deps import get_current_user, get_current_user_optional, get_session, require_admin
from app.core.expiry import run_expire_overdue_ad_items_task, run_expire_overdue_subscriptions_task
from app.core.limiter import limiter
from app.core.storage import InvalidFlyerFileError
from app.models.event import EventStatus
from app.models.user import User
from app.schemas.event import (
    EventCreate,
    EventDetailRead,
    EventFeaturedUpdate,
    EventPlanUpdate,
    EventRead,
    EventsByStatus,
    EventStatusUpdate,
    EventUpdate,
    FlyerUploadResponse,
    OrganizerPublicRead,
)
from app.schemas.subscription import OrganizerSubscriptionRead
from app.services.event_service import (
    create_event,
    delete_event,
    delete_event_flyer,
    get_event_detail,
    get_events_for_organizer,
    list_public_events,
    update_event,
    update_event_featured,
    update_event_plan,
    update_event_status,
    upload_event_flyer,
)
from app.services.payment_service import get_latest_subscriptions_by_event

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=list[EventRead])
@limiter.limit("60/minute")
async def get_events(
    request: Request,
    background_tasks: BackgroundTasks,
    city_id: UUID | None = Query(default=None),
    category: list[str] | None = Query(default=None),
    moment: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    search: str | None = Query(default=None),
    ticket_type: str | None = Query(default=None),
    location_id: UUID | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[EventRead]:
    # Etapa 8c: vencimiento lazy de destacados — corre en background, después
    # de enviada la respuesta, sin agregar latencia al listado. Ver
    # app/core/expiry.py.
    background_tasks.add_task(run_expire_overdue_subscriptions_task)
    # Etapa 8d-pre: mismo patrón para el vencimiento lazy de banners (AdItem).
    background_tasks.add_task(run_expire_overdue_ad_items_task)
    return list_public_events(
        session,
        city_id=city_id,
        categories=category,
        moment=moment,
        date_from=date_from,
        date_to=date_to,
        search=search,
        ticket_type=ticket_type,
        location_id=location_id,
    )


@router.post("", response_model=EventRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def post_event(
    request: Request,
    payload: EventCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> EventRead:
    try:
        return create_event(
            session,
            user_id=current_user.id,
            title=payload.title,
            description=payload.description,
            event_date=payload.date,
            event_time=payload.time,
            time_end=payload.time_end,
            date_end=payload.date_end,
            categories=payload.categories,
            location_id=payload.location_id,
            location_data=payload.location_data,
            ticket_type=payload.ticket_type,
            price_at_door=payload.price_at_door,
            price_advance=payload.price_advance,
            available_on_site=payload.available_on_site,
            contact_whatsapp=payload.contact_whatsapp,
            contact_instagram=payload.contact_instagram,
            contact_facebook=payload.contact_facebook,
            contact_web=payload.contact_web,
            contact_email=payload.contact_email,
            organizer_id=payload.organizer_id,
            plan=payload.plan,
            is_admin=current_user.role == "admin",
            city_id=payload.city_id,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/mine", response_model=EventsByStatus)
@limiter.limit("60/minute")
async def get_my_events(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> EventsByStatus:
    grouped = get_events_for_organizer(session, current_user.id)
    return EventsByStatus(
        pending=grouped[EventStatus.pending],
        approved=grouped[EventStatus.approved],
        rejected=grouped[EventStatus.rejected],
    )


@router.get("/{event_id}", response_model=EventDetailRead)
@limiter.limit("60/minute")
async def get_event(
    request: Request,
    event_id: UUID,
    session: Session = Depends(get_session),
    current_user: User | None = Depends(get_current_user_optional),
) -> EventDetailRead:
    try:
        event = get_event_detail(session, event_id, current_user)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    # El estado de pago del organizador (avisó transferencia, MP pendiente,
    # etc.) nunca se expone en la vista pública — solo al dueño o a un admin.
    organizer_subscription = None
    is_owner_or_admin = current_user is not None and (
        current_user.id == event.organizer_id or current_user.role == "admin"
    )
    if is_owner_or_admin:
        latest = get_latest_subscriptions_by_event(session, [event.id])
        subscription = latest.get(event.id)
        if subscription is not None:
            organizer_subscription = OrganizerSubscriptionRead(
                status=subscription.status,
                payment_method=subscription.payment_method,
                plan_name=subscription.plan.name,
                plan_type=subscription.plan.plan_type,
                transfer_note=subscription.transfer_note,
                created_at=subscription.created_at,
                reviewed_at=subscription.reviewed_at,
            )

    return EventDetailRead(
        **EventRead.model_validate(event).model_dump(),
        city_name=event.city.name,
        organizer=OrganizerPublicRead(
            public_name=event.organizer.public_name,
            public_whatsapp=event.organizer.public_whatsapp,
            city=event.organizer.city.name if event.organizer.city else None,
            is_verified=event.organizer.is_verified,
            phone_verified=event.organizer.phone_verified,
            email_verified=event.organizer.email_verified,
            member_since=event.organizer.created_at.date(),
        ),
        organizer_subscription=organizer_subscription,
    )


@router.put("/{event_id}", response_model=EventRead)
@limiter.limit("30/minute")
async def put_event(
    request: Request,
    event_id: UUID,
    payload: EventUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> EventRead:
    try:
        return update_event(session, event_id, current_user, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute")
async def delete_event_endpoint(
    request: Request,
    event_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> None:
    try:
        delete_event(session, event_id, current_user)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


async def _handle_flyer_upload(
    session: Session, event_id: UUID, current_user: User, file: UploadFile, size_type: str
) -> FlyerUploadResponse:
    content = await file.read()
    try:
        event = await upload_event_flyer(
            session,
            event_id,
            current_user,
            file_content=content,
            filename=file.filename or f"flyer-{size_type}",
            content_type=file.content_type or "application/octet-stream",
            size_type=size_type,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except InvalidFlyerFileError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return FlyerUploadResponse(
        flyer_url_desktop=event.flyer_url_desktop, flyer_url_mobile=event.flyer_url_mobile
    )


def _handle_flyer_delete(
    session: Session, event_id: UUID, current_user: User, size_type: str
) -> FlyerUploadResponse:
    try:
        event = delete_event_flyer(session, event_id, current_user, size_type=size_type)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    return FlyerUploadResponse(
        flyer_url_desktop=event.flyer_url_desktop, flyer_url_mobile=event.flyer_url_mobile
    )


@router.post("/{event_id}/flyer/desktop", response_model=FlyerUploadResponse)
@limiter.limit("20/minute")
async def post_event_flyer_desktop(
    request: Request,
    event_id: UUID,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> FlyerUploadResponse:
    """Etapa 12b — flyer para desktop/tablet (horizontal o cuadrado). JPG,
    PNG o WEBP, máx. 5MB. Organizador dueño (plan `pro`) o admin (cualquier
    plan)."""
    return await _handle_flyer_upload(session, event_id, current_user, file, "desktop")


@router.post("/{event_id}/flyer/mobile", response_model=FlyerUploadResponse)
@limiter.limit("20/minute")
async def post_event_flyer_mobile(
    request: Request,
    event_id: UUID,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> FlyerUploadResponse:
    """Etapa 12b — flyer para mobile (vertical o cuadrado), opcional. Si no
    se sube, se usa el de desktop para todas las resoluciones."""
    return await _handle_flyer_upload(session, event_id, current_user, file, "mobile")


@router.delete("/{event_id}/flyer/desktop", response_model=FlyerUploadResponse)
@limiter.limit("20/minute")
async def delete_event_flyer_desktop(
    request: Request,
    event_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> FlyerUploadResponse:
    return _handle_flyer_delete(session, event_id, current_user, "desktop")


@router.delete("/{event_id}/flyer/mobile", response_model=FlyerUploadResponse)
@limiter.limit("20/minute")
async def delete_event_flyer_mobile(
    request: Request,
    event_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> FlyerUploadResponse:
    return _handle_flyer_delete(session, event_id, current_user, "mobile")


@router.patch("/{event_id}/status", response_model=EventRead, dependencies=[Depends(require_admin)])
@limiter.limit("60/minute")
async def patch_event_status(
    request: Request,
    event_id: UUID,
    payload: EventStatusUpdate,
    session: Session = Depends(get_session),
) -> EventRead:
    try:
        return update_event_status(session, event_id, payload.status)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{event_id}/featured", response_model=EventRead, dependencies=[Depends(require_admin)])
@limiter.limit("60/minute")
async def patch_event_featured(
    request: Request,
    event_id: UUID,
    payload: EventFeaturedUpdate,
    session: Session = Depends(get_session),
) -> EventRead:
    try:
        return update_event_featured(session, event_id, payload.is_featured, payload.featured_until)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{event_id}/plan", response_model=EventRead, dependencies=[Depends(require_admin)])
@limiter.limit("60/minute")
async def patch_event_plan(
    request: Request,
    event_id: UUID,
    payload: EventPlanUpdate,
    session: Session = Depends(get_session),
) -> EventRead:
    try:
        return update_event_plan(session, event_id, payload.plan)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
