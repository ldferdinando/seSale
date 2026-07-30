from datetime import date, datetime, time, timezone
from uuid import UUID

from sqlalchemy import case, func
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from app.models.event import Event, EventPlan, EventStatus, TicketType
from app.models.location import Location
from app.models.user import User

_PLAN_RANK = case(
    (Event.plan == EventPlan.pro, 0),
    (Event.plan == EventPlan.dest, 1),
    else_=2,
)


def list_public_events(
    session: Session,
    *,
    city_id: UUID | None = None,
    category: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    search: str | None = None,
    today: date | None = None,
) -> list[Event]:
    """Eventos visibles al público: approved, activos y no vencidos.

    Orden: plan pro -> dest -> gratis, y dentro de cada plan por created_at DESC.
    """
    if today is None:
        today = datetime.now(timezone.utc).date()

    stmt = (
        select(Event)
        .where(Event.status == EventStatus.approved)
        .where(Event.is_active == True)  # noqa: E712
        .where(Event.date >= today)
        .options(selectinload(Event.location))
    )

    if city_id is not None:
        stmt = stmt.where(Event.city_id == city_id)
    if category is not None:
        stmt = stmt.where(Event.category == category)
    if date_from is not None:
        stmt = stmt.where(Event.date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Event.date <= date_to)
    if search:
        stmt = stmt.where(Event.title.ilike(f"%{search}%"))

    stmt = stmt.order_by(_PLAN_RANK, Event.created_at.desc())

    return list(session.exec(stmt).all())


def _find_or_create_location(session: Session, *, city_id: UUID, name: str, address: str) -> Location:
    stmt = select(Location).where(
        Location.city_id == city_id,
        func.lower(Location.name) == name.strip().lower(),
        func.lower(Location.address) == address.strip().lower(),
    )
    existing = session.exec(stmt).first()
    if existing is not None:
        return existing

    location = Location(name=name.strip(), address=address.strip(), city_id=city_id)
    session.add(location)
    session.flush()
    return location


def create_event(
    session: Session,
    *,
    user_id: UUID,
    title: str,
    description: str | None,
    event_date: date,
    event_time: time,
    category: str,
    location_name: str,
    location_address: str,
    ticket_type: TicketType = TicketType.gratis,
    price_at_door: int | None = None,
    price_advance: int | None = None,
    contact_whatsapp: str | None = None,
    contact_instagram: str | None = None,
    contact_web: str | None = None,
    contact_email: str | None = None,
) -> Event:
    """Crea un evento en estado pending para el organizador dado.

    city_id y location_id se derivan del organizador (Etapa 2 no tiene selector
    de ciudad ni endpoint de locations todavía): la ubicación se busca o se crea
    dentro de la ciudad del organizador.
    """
    organizer = session.get(User, user_id)
    if organizer is None:
        raise LookupError("Organizador no encontrado")
    if organizer.city_id is None:
        raise ValueError("El organizador no tiene una ciudad asignada")

    location = _find_or_create_location(
        session, city_id=organizer.city_id, name=location_name, address=location_address
    )

    event = Event(
        city_id=organizer.city_id,
        organizer_id=organizer.id,
        location_id=location.id,
        title=title,
        description=description,
        date=event_date,
        time=event_time,
        category=category,
        status=EventStatus.pending,
        ticket_type=ticket_type,
        price_at_door=price_at_door,
        price_advance=price_advance,
        contact_whatsapp=contact_whatsapp,
        contact_instagram=contact_instagram,
        contact_web=contact_web,
        contact_email=contact_email,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def get_events_for_organizer(session: Session, user_id: UUID) -> dict[EventStatus, list[Event]]:
    stmt = (
        select(Event)
        .where(Event.organizer_id == user_id)
        .options(selectinload(Event.location))
        .order_by(Event.created_at.desc())
    )
    events = session.exec(stmt).all()

    grouped: dict[EventStatus, list[Event]] = {
        EventStatus.pending: [],
        EventStatus.approved: [],
        EventStatus.rejected: [],
    }
    for event in events:
        grouped[event.status].append(event)
    return grouped


def update_event_status(session: Session, event_id: UUID, new_status: EventStatus) -> Event:
    event = session.get(Event, event_id)
    if event is None:
        raise LookupError("Evento no encontrado")

    event.status = new_status
    event.updated_at = datetime.now(timezone.utc)
    session.add(event)
    session.commit()
    session.refresh(event)
    return event
