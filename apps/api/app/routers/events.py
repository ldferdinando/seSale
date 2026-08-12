from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlmodel import Session

from app.core.deps import get_current_user, get_current_user_optional, get_session, require_admin
from app.core.limiter import limiter
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
    OrganizerPublicRead,
)
from app.services.event_service import (
    create_event,
    delete_event,
    get_event_detail,
    get_events_for_organizer,
    list_public_events,
    update_event,
    update_event_featured,
    update_event_plan,
    update_event_status,
)

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=list[EventRead])
@limiter.limit("60/minute")
async def get_events(
    request: Request,
    city_id: UUID | None = Query(default=None),
    category: list[str] | None = Query(default=None),
    moment: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    search: str | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[EventRead]:
    return list_public_events(
        session,
        city_id=city_id,
        categories=category,
        moment=moment,
        date_from=date_from,
        date_to=date_to,
        search=search,
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
            categories=payload.categories,
            location_name=payload.location_name,
            location_address=payload.location_address,
            ticket_type=payload.ticket_type,
            price_at_door=payload.price_at_door,
            price_advance=payload.price_advance,
            available_on_site=payload.available_on_site,
            contact_whatsapp=payload.contact_whatsapp,
            contact_instagram=payload.contact_instagram,
            contact_web=payload.contact_web,
            contact_email=payload.contact_email,
            organizer_id=payload.organizer_id,
            is_admin=current_user.role == "admin",
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

    return EventDetailRead(
        **EventRead.model_validate(event).model_dump(),
        city_name=event.city.name,
        organizer=OrganizerPublicRead(
            public_name=event.organizer.public_name,
            public_whatsapp=event.organizer.public_whatsapp,
            city=event.organizer.city.name if event.organizer.city else None,
        ),
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
