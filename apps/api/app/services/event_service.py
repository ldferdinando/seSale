from datetime import date, datetime, time, timezone
from uuid import UUID

from sqlalchemy import and_, case, func
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from app.models.event import Event, EventStatus, TicketType
from app.models.location import Location
from app.models.plan import PlanType
from app.models.user import User
from app.schemas.event import EventUpdate

_ORDER_RANK = case(
    (and_(Event.plan == PlanType.pro, Event.is_featured == True), 0),  # noqa: E712
    (Event.plan == PlanType.pro, 1),
    (and_(Event.plan == PlanType.dest, Event.is_featured == True), 2),  # noqa: E712
    (Event.plan == PlanType.dest, 3),
    (and_(Event.plan == PlanType.gratis, Event.is_featured == True), 4),  # noqa: E712
    (Event.plan == PlanType.gratis, 5),
    else_=6,
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

    Orden (siempre, independientemente de los filtros activos):
    1. plan=pro   + is_featured=True
    2. plan=pro   + is_featured=False
    3. plan=dest  + is_featured=True
    4. plan=dest  + is_featured=False
    5. plan=gratis + is_featured=True
    6. plan=gratis + is_featured=False
    Dentro de cada nivel, created_at DESC.
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

    stmt = stmt.order_by(_ORDER_RANK, Event.created_at.desc())

    return list(session.exec(stmt).all())


def get_public_stats(session: Session) -> dict[str, int]:
    """Estadísticas agregadas sobre eventos approved + activos (sin filtro de fecha)."""
    stmt = select(Event).where(
        Event.status == EventStatus.approved,
        Event.is_active == True,  # noqa: E712
    )
    events = session.exec(stmt).all()
    return {
        "total_events": len(events),
        "total_organizers": len({event.organizer_id for event in events}),
        "total_cities": len({event.city_id for event in events}),
    }


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
    time_end: time | None = None,
    moment: str | None = None,
    ticket_type: TicketType = TicketType.gratis,
    price_at_door: int | None = None,
    price_advance: int | None = None,
    available_on_site: bool = False,
    contact_whatsapp: str | None = None,
    contact_instagram: str | None = None,
    contact_web: str | None = None,
    contact_email: str | None = None,
    organizer_id: UUID | None = None,
    is_admin: bool = False,
) -> Event:
    """Crea un evento en estado pending para el organizador dado.

    city_id y location_id se derivan del organizador (Etapa 2 no tiene selector
    de ciudad ni endpoint de locations todavía): la ubicación se busca o se crea
    dentro de la ciudad del organizador.

    `organizer_id` solo tiene efecto si `is_admin=True` (Etapa 5.6: admin
    cargando eventos en nombre de otro organizador). Para un usuario normal
    se ignora y el organizador siempre es `user_id`.
    """
    effective_organizer_id = organizer_id if (is_admin and organizer_id is not None) else user_id

    organizer = session.get(User, effective_organizer_id)
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
        time_end=time_end,
        moment=moment,
        category=category,
        status=EventStatus.pending,
        ticket_type=ticket_type,
        price_at_door=price_at_door,
        price_advance=price_advance,
        available_on_site=available_on_site,
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


def update_event_featured(
    session: Session, event_id: UUID, is_featured: bool, featured_until: datetime | None
) -> Event:
    event = session.get(Event, event_id)
    if event is None:
        raise LookupError("Evento no encontrado")

    event.is_featured = is_featured
    event.featured_until = featured_until
    event.updated_at = datetime.now(timezone.utc)
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def update_event_plan(session: Session, event_id: UUID, plan: PlanType) -> Event:
    event = session.get(Event, event_id)
    if event is None:
        raise LookupError("Evento no encontrado")

    event.plan = plan
    if plan == PlanType.gratis:
        event.featured_until = None
    event.updated_at = datetime.now(timezone.utc)
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def get_event_detail(session: Session, event_id: UUID, current_user: User | None) -> Event:
    """Detalle completo de un evento, con reglas de visibilidad por status.

    - approved + is_active: visible para cualquiera.
    - pending/rejected: visible solo para el organizador dueño del evento.
    - cualquier otro caso: LookupError (404 en el router).
    """
    stmt = (
        select(Event)
        .where(Event.id == event_id)
        .options(
            selectinload(Event.location),
            selectinload(Event.city),
            selectinload(Event.organizer).selectinload(User.city),
        )
    )
    event = session.exec(stmt).first()
    if event is None:
        raise LookupError("Evento no encontrado")

    is_public = event.status == EventStatus.approved and event.is_active
    is_owner = current_user is not None and event.organizer_id == current_user.id
    if not is_public and not is_owner:
        raise LookupError("Evento no encontrado")

    return event


def update_event(
    session: Session, event_id: UUID, current_user: User, payload: EventUpdate
) -> Event:
    event = session.get(Event, event_id)
    if event is None:
        raise LookupError("Evento no encontrado")

    is_owner = event.organizer_id == current_user.id
    is_admin = current_user.role == "admin"
    if not is_owner and not is_admin:
        raise PermissionError("No tenés permiso para editar este evento")

    data = payload.model_dump(exclude_unset=True)

    if "location_name" in data or "location_address" in data:
        location = session.get(Location, event.location_id)
        name = data.pop("location_name", location.name if location else None)
        address = data.pop("location_address", location.address if location else None)
        event.location_id = _find_or_create_location(
            session, city_id=event.city_id, name=name, address=address
        ).id

    for field, value in data.items():
        setattr(event, field, value)

    if is_owner and not is_admin:
        event.status = EventStatus.pending

    event.updated_at = datetime.now(timezone.utc)
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def delete_event(session: Session, event_id: UUID, current_user: User) -> Event:
    """Soft delete: nunca se borra la fila, se marca is_active=False.

    Permitido para el organizador dueño del evento o para un admin.
    """
    event = session.get(Event, event_id)
    if event is None:
        raise LookupError("Evento no encontrado")

    is_owner = event.organizer_id == current_user.id
    is_admin = current_user.role == "admin"
    if not is_owner and not is_admin:
        raise PermissionError("No tenés permiso para eliminar este evento")

    event.is_active = False
    event.updated_at = datetime.now(timezone.utc)
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


_ADMIN_ORDER_RANK = case(
    (Event.status == EventStatus.pending, 0),
    else_=1,
)


def list_admin_events(
    session: Session,
    *,
    status: EventStatus | None = None,
    city_id: UUID | None = None,
    category: str | None = None,
    plan: PlanType | None = None,
    search: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Event]:
    """Listado completo de eventos para el panel admin: todos los status y
    activos/inactivos. Orden: pending primero, luego created_at DESC."""
    stmt = select(Event).options(
        selectinload(Event.location),
        selectinload(Event.organizer),
    )

    if status is not None:
        stmt = stmt.where(Event.status == status)
    if city_id is not None:
        stmt = stmt.where(Event.city_id == city_id)
    if category is not None:
        stmt = stmt.where(Event.category == category)
    if plan is not None:
        stmt = stmt.where(Event.plan == plan)
    if date_from is not None:
        stmt = stmt.where(Event.date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Event.date <= date_to)
    if search:
        stmt = stmt.where(Event.title.ilike(f"%{search}%"))

    stmt = stmt.order_by(_ADMIN_ORDER_RANK, Event.created_at.desc()).offset(offset).limit(limit)

    return list(session.exec(stmt).all())
