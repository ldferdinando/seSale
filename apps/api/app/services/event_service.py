from datetime import date, datetime, time, timedelta, timezone
from uuid import UUID

from sqlalchemy import case, delete, func, or_
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from app.core.moment import calculate_moments
from app.core.storage import delete_flyer, upload_flyer, validate_flyer_file
from app.core.timezone import ARGENTINA_TZ, utc_time_to_argentina
from app.models.category import EventCategory
from app.models.city import City
from app.models.event import Event, EventStatus, TicketType
from app.models.location import Location
from app.models.moment import EventMoment
from app.models.plan import PlanType
from app.models.user import User
from app.schemas.event import EventUpdate
from app.schemas.location import LocationCreate
from app.services.category_catalog_service import get_active_category_keys
from app.services.location_service import create_location_from_event_data, get_location_or_404

_EVENT_LOAD_OPTIONS = (selectinload(Event.location), selectinload(Event.category_links))


def _validate_categories_active(session: Session, categories: list[str]) -> None:
    """Etapa 12a: valida que cada categoría exista y esté activa en
    event_categories_catalog. Reemplaza el chequeo contra el set
    VALID_CATEGORIES hardcodeado que vivía en app.schemas.event — acá sí hay
    sesión de DB disponible."""
    active_keys = get_active_category_keys(session)
    invalid = [c for c in categories if c not in active_keys]
    if invalid:
        raise ValueError(f"Categoría inválida: {invalid[0]}")


def _sync_event_categories(session: Session, event: Event, categories: list[str]) -> None:
    """Replace completo: borra las categorías existentes y crea las nuevas."""
    session.exec(delete(EventCategory).where(EventCategory.event_id == event.id))
    for category in categories:
        session.add(EventCategory(event_id=event.id, category=category))


def _sync_event_moments(session: Session, event: Event) -> None:
    """Recalcula y reemplaza los momentos del evento desde time/time_end.

    `event.time`/`event.time_end` se guardan en UTC — hay que pasarlos a
    hora Argentina antes de clasificar diurno/nocturno, que es una noción
    de horario local.
    """
    session.exec(delete(EventMoment).where(EventMoment.event_id == event.id))
    local_start = utc_time_to_argentina(event.date, event.time)
    local_end = utc_time_to_argentina(event.date, event.time_end) if event.time_end else None
    for moment in calculate_moments(local_start, local_end):
        session.add(EventMoment(event_id=event.id, moment=moment))

def is_event_currently_visible(
    event_date: date,
    date_end: date | None,
    time_end: time,
    now: datetime,
) -> bool:
    """Etapa 10b — ¿debe aparecer este evento en el listado público ahora?

    Reemplaza las 3 condiciones A/B/C de la Etapa 10a (evento futuro / de
    hoy / de ayer cruzando medianoche todavía en curso) por una sola: el
    evento es visible mientras no haya terminado. `date_end` explícito
    (Etapa 10b) hace innecesaria la inferencia implícita de "cruza
    medianoche" (`time_end < time_start`) que usaba la versión anterior —
    ahora la fecha de fin real ya viene en el dato, no hay que adivinarla.

    `date_end=None` (filas de antes de la Etapa 10b, o cualquier evento
    creado sin fecha de fin explícita) se trata como `date_end =
    event_date` — mismo criterio que `EventRead.date_end` y
    `Event.date_end` en el modelo.

    `now` es un datetime aware en UTC — la comparación es 100% en UTC,
    consistente con cómo se guardan `time`/`time_end` (nunca se convierte a
    hora Argentina acá).

    Cambio de comportamiento real respecto a la Etapa 10a: un evento de
    HOY cuyo horario ya terminó (ej. terminó a las 10:00 y son las 15:00)
    deja de ser visible apenas termina — antes, cualquier evento con
    `event_date == hoy` quedaba visible todo el día sin importar la hora.
    """
    effective_date_end = date_end or event_date
    end_datetime = datetime.combine(effective_date_end, time_end, tzinfo=timezone.utc)
    return end_datetime >= now


def _current_utc_now() -> datetime:
    """Wrapper trivial sobre `datetime.now(timezone.utc)`, en su propia
    función para poder patchearlo en tests — `datetime.now` no se puede
    monkeypatchear directamente (es un método de un tipo built-in
    inmutable), mismo motivo por el que `argentina_today()` existe como
    función propia en `app/core/timezone.py`."""
    return datetime.now(timezone.utc)


_ORDER_RANK = case(
    (Event.plan == PlanType.pro, 1),
    (Event.plan == PlanType.dest, 2),
    (Event.plan == PlanType.gratis, 3),
    else_=4,
)


def list_public_events(
    session: Session,
    *,
    city_id: UUID | None = None,
    categories: list[str] | None = None,
    moment: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    search: str | None = None,
    ticket_type: str | None = None,
    location_id: UUID | None = None,
    today: date | None = None,
    now: datetime | None = None,
) -> list[Event]:
    """Eventos visibles al público: approved, activos y no vencidos.

    Orden (siempre, independientemente de los filtros activos) — Etapa 11c:
    1. plan (pro → dest → gratis)
    2. date ASC (evento más próximo primero)
    3. time ASC (dentro del mismo día, el más temprano primero)

    `is_featured` ya no afecta este orden (antes subía al tope dentro del
    mismo plan) — sigue existiendo en el modelo y el admin puede marcarlo,
    pero solo tiene efecto en el panel admin, no en el listado público.

    `categories`: OR entre los valores dados (evento con AL MENOS UNA).
    `moment`: eventos que tengan ese momento entre los suyos (un evento con
    horario dual aparece en ambos filtros).
    `location_id`: Etapa 8e — eventos de un lugar puntual (usado por el
    detalle de un lugar gastronómico, "Eventos en este lugar").

    Etapa 10b — `is_event_currently_visible()` decide evento por evento si
    ya terminó (usa `date_end`, explícito). El filtro SQL de acá abajo
    compara contra `coalesce(Event.date_end, Event.date)` — no contra
    `Event.date` solo — para no descartar en SQL eventos que empezaron
    antes de "hoy - 1" pero cuyo `date_end` todavía no llegó (cruce de
    medianoche, o un evento de varios días). Se mantiene el margen de un
    día (`today - 1`) por la misma razón que en la Etapa 10a: el chequeo
    fino en Python usa UTC, y "hoy" (Argentina) puede ir un día atrás del
    "hoy" UTC cerca de la medianoche. El resto de los filtros (`date_from`,
    `date_to`, etc.) se siguen aplicando en SQL contra `Event.date`
    (fecha de inicio) igual que antes.
    """
    if now is None:
        if today is not None:
            # `today` fue fijado a mano (tests) sin `now`: se ancla a
            # mediodía UTC de esa fecha, que en Argentina (UTC-3) sigue
            # siendo el mismo día — así `is_event_currently_visible()`
            # deriva el mismo "hoy" que este filtro SQL, sin tener que
            # pasar los dos parámetros siempre.
            now = datetime.combine(today, time(12, 0), tzinfo=timezone.utc)
        else:
            now = _current_utc_now()
    if today is None:
        today = now.astimezone(ARGENTINA_TZ).date()

    effective_date_end_col = func.coalesce(Event.date_end, Event.date)
    stmt = (
        select(Event)
        .where(Event.status == EventStatus.approved)
        .where(Event.is_active == True)  # noqa: E712
        .where(effective_date_end_col >= today - timedelta(days=1))
        .options(*_EVENT_LOAD_OPTIONS)
    )

    if city_id is not None:
        stmt = stmt.where(Event.city_id == city_id)
    if location_id is not None:
        stmt = stmt.where(Event.location_id == location_id)
    if categories:
        cat_subq = select(EventCategory.event_id).where(
            EventCategory.event_id == Event.id, EventCategory.category.in_(categories)
        )
        stmt = stmt.where(cat_subq.exists())
    if moment is not None:
        moment_subq = select(EventMoment.event_id).where(
            EventMoment.event_id == Event.id, EventMoment.moment == moment
        )
        stmt = stmt.where(moment_subq.exists())
    if date_from is not None:
        stmt = stmt.where(Event.date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Event.date <= date_to)
    if search:
        # Etapa 12b — búsqueda ampliada: título, descripción, nombre del
        # lugar (locations.name) y categorías (event_categories.category),
        # todo case-insensitive (ilike). Se resuelve con subqueries EXISTS
        # (mismo patrón que los filtros `categories`/`moment` de arriba) en
        # vez de JOIN + DISTINCT: el JOIN a event_categories multiplicaría
        # filas por evento multi-categoría, y un SELECT DISTINCT rompería el
        # ORDER BY por `_ORDER_RANK` en Postgres (la expresión CASE tendría
        # que estar en el SELECT). EXISTS evita el duplicado de raíz.
        like = f"%{search}%"
        loc_subq = select(Location.id).where(
            Location.id == Event.location_id, Location.name.ilike(like)
        )
        search_cat_subq = select(EventCategory.event_id).where(
            EventCategory.event_id == Event.id, EventCategory.category.ilike(like)
        )
        stmt = stmt.where(
            or_(
                Event.title.ilike(like),
                Event.description.ilike(like),
                loc_subq.exists(),
                search_cat_subq.exists(),
            )
        )
    if ticket_type == "gratis":
        stmt = stmt.where(Event.ticket_type == TicketType.gratis)
    elif ticket_type == "pago":
        stmt = stmt.where(Event.ticket_type.in_([TicketType.pago, TicketType.anticipo]))

    stmt = stmt.order_by(_ORDER_RANK, Event.date.asc(), Event.time.asc())

    events = session.exec(stmt).all()
    # El ORDER BY ya lo resolvió la DB — el filtro fino de acá abajo no lo
    # altera, solo descarta filas (list comprehension conserva el orden).
    return [
        event for event in events if is_event_currently_visible(event.date, event.date_end, event.time_end, now)
    ]


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


def _resolve_target_city(session: Session, city_id: UUID | None, fallback_city_id: UUID) -> UUID:
    """Etapa 7a: `city_id` explícito (elegido por el organizador en el
    formulario) sobrepasa el default. `None` conserva el comportamiento
    previo — se deriva de `fallback_city_id` (la ciudad del organizador en
    `create_event`, la ciudad actual del evento en `update_event`).
    """
    if city_id is None:
        return fallback_city_id

    city = session.get(City, city_id)
    if city is None:
        raise LookupError("Ciudad no encontrada")
    if not city.is_active:
        raise ValueError("La ciudad elegida no está activa")
    return city_id


def _validate_location_city_matches_event(location_city_id: UUID, event_city_id: UUID) -> None:
    """Etapa 8a — `location_data.city_id` (Tab "Indicar en el mapa") debe
    coincidir con la ciudad efectiva del evento. El frontend siempre manda
    el mismo city_id en ambos campos, pero el backend lo fuerza para ser
    robusto ante llamadas directas a la API."""
    if location_city_id != event_city_id:
        raise ValueError("La ciudad de la ubicación debe coincidir con la ciudad del evento.")


def _resolve_event_location(
    session: Session,
    *,
    location_id: UUID | None,
    location_data: LocationCreate | None,
    event_city_id: UUID,
) -> Location:
    """Resuelve la ubicación de un evento nuevo — Etapa 7b.

    location_id: lugar ya existente (precargado por el admin o cargado
    antes por otro organizador) — se usa tal cual. location_data: crea un
    Location nuevo con is_public=False a partir de dirección libre +
    coordenadas del mapa. Si vienen los dos, se prioriza location_id. Si no
    viene ninguno, es un error de validación (uno de los dos es requerido).

    `event_city_id`: ciudad efectiva del evento — Etapa 8a, se valida contra
    `location_data.city_id` (ver `_validate_location_city_matches_event`).
    """
    if location_id is not None:
        return get_location_or_404(session, location_id)
    if location_data is not None:
        _validate_location_city_matches_event(location_data.city_id, event_city_id)
        return create_location_from_event_data(session, location_data)
    raise ValueError("Se requiere location_id o location_data")


def create_event(
    session: Session,
    *,
    user_id: UUID,
    title: str,
    description: str | None,
    event_date: date,
    event_time: time,
    categories: list[str],
    location_id: UUID | None = None,
    location_data: LocationCreate | None = None,
    time_end: time,  # Etapa 10a — obligatorio, sin default (igual que el modelo)
    date_end: date | None = None,  # Etapa 10b — None => mismo día que event_date
    ticket_type: TicketType = TicketType.gratis,
    price_at_door: int | None = None,
    price_advance: int | None = None,
    available_on_site: bool = False,
    contact_whatsapp: str | None = None,
    contact_instagram: str | None = None,
    contact_facebook: str | None = None,
    contact_web: str | None = None,
    contact_email: str | None = None,
    organizer_id: UUID | None = None,
    is_admin: bool = False,
    city_id: UUID | None = None,
    plan: PlanType = PlanType.gratis,
) -> Event:
    """Crea un evento en estado pending para el organizador dado.

    `city_id`: ciudad efectiva del evento — por default, la ciudad del
    organizador; desde la Etapa 7a el organizador puede elegir otra ciudad
    activa explícitamente (ej. publica un evento que ocurre en una ciudad
    distinta a la suya). La ubicación (`location_id`/`location_data`, Etapa
    7b) es independiente de este cálculo — ver `_resolve_event_location`.

    `organizer_id` solo tiene efecto si `is_admin=True` (Etapa 5.6: admin
    cargando eventos en nombre de otro organizador). Para un usuario normal
    se ignora y el organizador siempre es `user_id`.

    `contact_whatsapp`: si no se manda explícito, se completa con el
    `public_whatsapp` del perfil del organizador (Etapa 8a) — no es un
    campo que el organizador carga por evento.

    `plan` (Etapa 9b): protección server-side — hoy no hay confirmación
    de pago inmediata al crear, así que cualquier valor distinto de
    "gratis" se ignora y el evento nace igual en "gratis". El plan real
    se asigna recién cuando se confirma el pago (webhook de MP o revisión
    de transferencia), vía `update_event_plan`.
    """
    effective_organizer_id = organizer_id if (is_admin and organizer_id is not None) else user_id
    effective_plan = plan if plan == PlanType.gratis else PlanType.gratis

    organizer = session.get(User, effective_organizer_id)
    if organizer is None:
        raise LookupError("Organizador no encontrado")
    if organizer.city_id is None:
        raise ValueError("El organizador no tiene una ciudad asignada")

    if not contact_whatsapp:
        contact_whatsapp = organizer.public_whatsapp

    _validate_categories_active(session, categories)

    target_city_id = _resolve_target_city(session, city_id, organizer.city_id)

    location = _resolve_event_location(
        session, location_id=location_id, location_data=location_data, event_city_id=target_city_id
    )

    event = Event(
        city_id=target_city_id,
        organizer_id=organizer.id,
        location_id=location.id,
        title=title,
        description=description,
        date=event_date,
        time=event_time,
        time_end=time_end,
        date_end=date_end or event_date,
        status=EventStatus.pending,
        plan=effective_plan,
        ticket_type=ticket_type,
        price_at_door=price_at_door,
        price_advance=price_advance,
        available_on_site=available_on_site,
        contact_whatsapp=contact_whatsapp,
        contact_instagram=contact_instagram,
        contact_facebook=contact_facebook,
        contact_web=contact_web,
        contact_email=contact_email,
    )
    session.add(event)
    session.flush()

    _sync_event_categories(session, event, categories)
    _sync_event_moments(session, event)

    session.commit()
    session.refresh(event)
    return event


def get_events_for_organizer(session: Session, user_id: UUID) -> dict[EventStatus, list[Event]]:
    """Eventos del organizador, agrupados por status — GET /api/events/mine.

    Etapa 11c: dentro de `approved`, orden por `date ASC` (el evento del
    organizador que ocurre antes aparece primero) — `pending`/`rejected` no
    tienen una fecha relevante para el organizador en este contexto (esperan
    moderación o ya fueron descartados), así que se mantienen ordenados por
    `created_at DESC` como antes.
    """
    stmt = (
        select(Event)
        .where(Event.organizer_id == user_id)
        .options(*_EVENT_LOAD_OPTIONS)
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
    grouped[EventStatus.approved].sort(key=lambda event: event.date)
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
    - pending/rejected: visible para el organizador dueño del evento o un admin
      (Etapa 6b-1: el panel admin necesita poder ver/editar eventos pending
      desde el listado — antes solo el dueño podía, y GET devolvía 404 al
      admin incluso con el link "Editar" del panel).
    - cualquier otro caso: LookupError (404 en el router).
    """
    stmt = (
        select(Event)
        .where(Event.id == event_id)
        .options(
            selectinload(Event.location),
            selectinload(Event.category_links),
            selectinload(Event.city),
            selectinload(Event.organizer).selectinload(User.city),
        )
    )
    event = session.exec(stmt).first()
    if event is None:
        raise LookupError("Evento no encontrado")

    is_public = event.status == EventStatus.approved and event.is_active
    is_owner = current_user is not None and event.organizer_id == current_user.id
    is_admin = current_user is not None and current_user.role == "admin"
    if not is_public and not is_owner and not is_admin:
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
    # Etapa 10b-2: si el dueño (no admin) manda ÚNICAMENTE is_active (dar de
    # baja/volver a publicar), no se resetea `status` a pending más abajo —
    # ver el comentario junto a esa asignación. Cualquier otro campo en el
    # payload (aunque venga junto a is_active) mantiene el comportamiento
    # existente: vuelve a pending.
    only_toggles_active = set(data.keys()) == {"is_active"}
    categories = data.pop("categories", None)
    if categories is not None:
        _validate_categories_active(session, categories)
    new_city_id = data.pop("city_id", None)
    target_city_id = _resolve_target_city(session, new_city_id, event.city_id)

    new_location_id = data.pop("location_id", None)
    new_location_data = data.pop("location_data", None)
    if new_location_id is not None:
        event.location_id = get_location_or_404(session, new_location_id).id
    elif new_location_data is not None:
        location_data = (
            new_location_data
            if isinstance(new_location_data, LocationCreate)
            else LocationCreate.model_validate(new_location_data)
        )
        _validate_location_city_matches_event(location_data.city_id, target_city_id)
        event.location_id = create_location_from_event_data(session, location_data).id
    # Si vienen ambos None (no se mandaron), no se toca la ubicación actual.

    event.city_id = target_city_id

    # Etapa 8a: contact_whatsapp es un dato del perfil del organizador, no
    # un campo por evento todavía — si el payload no lo manda (o lo manda
    # None) no se pisa el valor existente. Si en el futuro el organizador
    # puede completarlo por evento, sacar este guard.
    if data.get("contact_whatsapp") is None:
        data.pop("contact_whatsapp", None)

    for field, value in data.items():
        setattr(event, field, value)

    if categories is not None:
        _sync_event_categories(session, event, categories)

    # time/time_end pueden haber cambiado — se recalcula siempre (es idempotente).
    _sync_event_moments(session, event)

    # Etapa 10b-2: excepción puntual — un PUT que solo trae is_active (dar de
    # baja/volver a publicar) no vuelve el evento a pending. Cualquier otro
    # campo editado por el dueño sigue reseteando a pending, sin cambios.
    if is_owner and not is_admin and not only_toggles_active:
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


_FLYER_ATTR = {"desktop": "flyer_url_desktop", "mobile": "flyer_url_mobile"}


def _check_flyer_permission_and_plan(event: Event, current_user: User) -> None:
    """Etapa 8b/12b — quién puede gestionar el flyer de un evento:

    - El organizador dueño: solo con plan Destacado Plus (`pro`), tal como
      lo modela seSALE_primario.html (`selPlan(el, esPlus)`: el bloque de
      subida solo aparece con Destacado Plus).
    - El admin: siempre, sin importar el plan del evento (Etapa 12b).
    - Cualquier otro: 403.
    """
    is_owner = event.organizer_id == current_user.id
    is_admin = current_user.role == "admin"
    if not is_owner and not is_admin:
        raise PermissionError("No tenés permiso para gestionar el flyer de este evento")

    if is_admin:
        return

    if event.plan == PlanType.gratis:
        raise ValueError("El plan Gratuito no incluye flyer. Actualizá tu plan para subir una imagen.")
    if event.plan == PlanType.dest:
        raise ValueError("El plan Destacado no incluye flyer. Actualizá a Destacado Plus para subir una imagen.")


async def upload_event_flyer(
    session: Session,
    event_id: UUID,
    current_user: User,
    *,
    file_content: bytes,
    filename: str,
    content_type: str,
    size_type: str,
) -> Event:
    """`size_type`: "desktop" | "mobile" — Etapa 12b, flyer dual."""
    event = session.get(Event, event_id)
    if event is None:
        raise LookupError("Evento no encontrado")

    _check_flyer_permission_and_plan(event, current_user)

    attr = _FLYER_ATTR[size_type]

    # Si ya tenía un flyer de este tamaño, se reemplaza en el storage — no se
    # acumulan archivos huérfanos (validar el archivo nuevo primero: si es
    # inválido, no se toca el flyer existente).
    validate_flyer_file(content_type, len(file_content))
    current_url = getattr(event, attr)
    if current_url:
        delete_flyer(current_url, event.id, size_type)

    setattr(
        event,
        attr,
        await upload_flyer(
            file_content=file_content,
            filename=filename,
            content_type=content_type,
            event_id=event.id,
            size_type=size_type,
        ),
    )
    event.updated_at = datetime.now(timezone.utc)
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def delete_event_flyer(session: Session, event_id: UUID, current_user: User, *, size_type: str) -> Event:
    event = session.get(Event, event_id)
    if event is None:
        raise LookupError("Evento no encontrado")

    is_owner = event.organizer_id == current_user.id
    is_admin = current_user.role == "admin"
    if not is_owner and not is_admin:
        raise PermissionError("No tenés permiso para gestionar el flyer de este evento")

    attr = _FLYER_ATTR[size_type]
    current_url = getattr(event, attr)
    if current_url:
        delete_flyer(current_url, event.id, size_type)
    setattr(event, attr, None)
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
    organizer_id: UUID | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Event]:
    """Listado completo de eventos para el panel admin: todos los status y
    activos/inactivos. Orden: pending primero, luego created_at DESC.

    `organizer_id` (Etapa 9b) — filtra los eventos de un organizador
    puntual, usado por el link "Ver eventos del usuario" del panel admin
    de usuarios."""
    stmt = select(Event).options(
        selectinload(Event.location),
        selectinload(Event.organizer),
        selectinload(Event.category_links),
    )

    if status is not None:
        stmt = stmt.where(Event.status == status)
    if city_id is not None:
        stmt = stmt.where(Event.city_id == city_id)
    if organizer_id is not None:
        stmt = stmt.where(Event.organizer_id == organizer_id)
    if category is not None:
        cat_subq = select(EventCategory.event_id).where(
            EventCategory.event_id == Event.id, EventCategory.category == category
        )
        stmt = stmt.where(cat_subq.exists())
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
