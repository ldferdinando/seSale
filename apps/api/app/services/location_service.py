from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import and_, case, delete, func, or_
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from app.core.storage import delete_cover, delete_featured_banner, upload_cover, upload_featured_banner
from app.core.timezone import argentina_today
from app.models.city import City
from app.models.event import Event, EventStatus
from app.models.gastro_type_catalog import GastroTypeCatalog
from app.models.location import Location
from app.models.location_gastro_type import LocationGastroType
from app.schemas.location import (
    LocationAdminCreate,
    LocationAdminRead,
    LocationAdminUpdate,
    LocationCreate,
    LocationGastroRead,
    LocationRead,
)
from app.services.gastro_type_catalog_service import get_active_gastro_type_keys

_LOCATION_LOAD_OPTIONS = (selectinload(Location.city),)


def _to_location_read(location: Location) -> LocationRead:
    return LocationRead(
        id=location.id,
        name=location.name,
        address=location.address,
        description=location.description,
        hours=location.hours,
        place_type=location.place_type,
        city_id=location.city_id,
        city_name=location.city.name if location.city else "",
        latitude=location.latitude,
        longitude=location.longitude,
        is_verified=location.is_verified,
        is_public=location.is_public,
    )


def list_public_locations(
    session: Session,
    *,
    city_id: UUID,
    search: str | None = None,
    place_type: str | None = None,
) -> list[LocationRead]:
    """Lugares precargados (is_public=True) y activos de una ciudad — selector
    del formulario de evento. No filtra por is_gastro ni por tipos: un lugar
    sin tipos asignados ("solo venue de eventos") también se puede elegir.
    Orden: verificados primero, luego alfabético."""
    stmt = (
        select(Location)
        .where(
            Location.city_id == city_id,
            Location.is_public == True,  # noqa: E712
            Location.is_active == True,  # noqa: E712
        )
        .options(*_LOCATION_LOAD_OPTIONS)
    )
    if search:
        stmt = stmt.where(
            (Location.name.ilike(f"%{search}%")) | (Location.address.ilike(f"%{search}%"))
        )
    if place_type:
        stmt = stmt.where(Location.place_type == place_type)

    locations = session.exec(stmt).all()
    locations = sorted(locations, key=lambda loc: (not loc.is_verified, loc.name.lower()))
    return [_to_location_read(loc) for loc in locations]


def get_location(session: Session, location_id: UUID) -> LocationRead:
    """Cualquier Location (público o no) — usado para mostrar la ubicación de
    un evento aunque no sea un lugar precargado."""
    stmt = select(Location).where(Location.id == location_id).options(*_LOCATION_LOAD_OPTIONS)
    location = session.exec(stmt).first()
    if location is None:
        raise LookupError("Lugar no encontrado")
    return _to_location_read(location)


def get_location_or_404(session: Session, location_id: UUID) -> Location:
    """Igual a get_location pero devuelve el modelo (para uso interno, ej.
    resolver la ubicación de un evento nuevo)."""
    location = session.get(Location, location_id)
    if location is None:
        raise LookupError("Lugar no encontrado")
    return location


def create_location_from_event_data(session: Session, data: LocationCreate) -> Location:
    """Crea un Location a partir de dirección libre cargada en el formulario
    de evento (Tab "Indicar en el mapa") — nace is_public=False, no aparece
    en el selector de lugares precargados."""
    city = session.get(City, data.city_id)
    if city is None:
        raise LookupError("Ciudad no encontrada")
    if not city.is_active:
        raise ValueError("La ciudad elegida no está activa")

    location = Location(
        name=(data.name or "").strip() or None,
        address=data.address.strip(),
        city_id=data.city_id,
        latitude=data.latitude,
        longitude=data.longitude,
        is_public=False,
        is_verified=False,
    )
    if location.name is None:
        # `Location.name` es obligatorio en el modelo — si el organizador no
        # cargó nombre, se usa la dirección como nombre de referencia.
        location.name = location.address
    session.add(location)
    session.flush()
    return location


def _event_counts(session: Session, location_ids: list[UUID]) -> dict[UUID, int]:
    if not location_ids:
        return {}
    stmt = (
        select(Event.location_id, func.count(Event.id))
        .where(Event.location_id.in_(location_ids))
        .group_by(Event.location_id)
    )
    return dict(session.exec(stmt).all())


# ── Etapa 8e — Gastronomía ──────────────────────────────────────────────────

_GASTRO_LOAD_OPTIONS = (selectinload(Location.city), selectinload(Location.gastro_types))


def is_location_featured_now(location: Location, *, now: datetime | None = None) -> str | None:
    """Plan vigente de un Location en este instante: "pro"/"dest" si el plan
    guardado es uno de esos Y (no tiene featured_until, o todavía no venció);
    None en cualquier otro caso (plan "gratis", o pago pero vencido).

    Se calcula en vivo, sin cron — mismo patrón que
    payment_service.get_current_plan_price(): nada persiste el vencimiento,
    simplemente deja de contar en cada lectura a partir de `featured_until`.
    """
    if location.plan not in ("pro", "dest"):
        return None
    moment = now or datetime.now(timezone.utc)
    until = location.featured_until
    if until is not None:
        # `featured_until` es una columna DateTime sin timezone (igual que
        # el resto de columnas de fecha del proyecto, ver migración 0014):
        # lo que vuelve de la DB es naive, aunque se guardó en UTC. Se
        # normaliza acá en vez de cambiar el tipo de columna.
        if until.tzinfo is None:
            until = until.replace(tzinfo=timezone.utc)
        if until < moment:
            return None
    return location.plan


def _featured_order_rank(now: datetime):
    """Orden de "destacados" — Etapa "Lugares destacados temporales": Plus
    (pro) vigente primero, Destacado (dest) vigente después, el resto al
    final; alfabético por nombre dentro de cada grupo (ver callers). Ya no
    mezcla pro+dest en un solo grupo (reemplaza el criterio de Etapa 11c,
    que no distinguía entre sí) y, a diferencia de esa etapa, un plan pago
    vencido (featured_until < hoy) cuenta como "el resto", no como
    destacado. Aplica tanto al listado público (list_public_gastro_places)
    como al panel admin (list_admin_locations) — comparten el mismo
    criterio a propósito.

    `now` se compara naive (sin tzinfo): featured_until es una columna
    DateTime sin timezone (ver is_location_featured_now) — lo que se
    guardó siempre fue UTC, así que comparar el valor naive equivalente da
    el mismo resultado sin que el driver de DB tenga que reconciliar
    aware/naive."""
    now_naive = now.replace(tzinfo=None) if now.tzinfo is not None else now
    vigente_pro = and_(
        Location.plan == "pro", or_(Location.featured_until.is_(None), Location.featured_until >= now_naive)
    )
    vigente_dest = and_(
        Location.plan == "dest", or_(Location.featured_until.is_(None), Location.featured_until >= now_naive)
    )
    return case((vigente_pro, 0), (vigente_dest, 1), else_=2)


def _gastro_event_counts(session: Session, location_ids: list[UUID]) -> dict[UUID, int]:
    """Eventos aprobados y futuros por lugar — usado como `event_count`."""
    if not location_ids:
        return {}
    today = argentina_today()
    stmt = (
        select(Event.location_id, func.count(Event.id))
        .where(
            Event.location_id.in_(location_ids),
            Event.status == EventStatus.approved,
            Event.date >= today,
        )
        .group_by(Event.location_id)
    )
    return dict(session.exec(stmt).all())


def _to_gastro_read(location: Location, event_count: int) -> LocationGastroRead:
    return LocationGastroRead(
        id=location.id,
        name=location.name,
        address=location.address,
        city_id=location.city_id,
        city_name=location.city.name if location.city else "",
        latitude=location.latitude,
        longitude=location.longitude,
        description=location.description,
        hours=location.hours,
        opening_hours=location.opening_hours,
        gastro_types=sorted(t.gastro_type for t in location.gastro_types),
        gastro_whatsapp=location.gastro_whatsapp,
        gastro_instagram=location.gastro_instagram,
        gastro_web=location.gastro_web,
        gastro_email=location.gastro_email,
        gastro_facebook=location.gastro_facebook,
        gastro_phone=location.gastro_phone,
        has_delivery=location.has_delivery,
        has_reservations=location.has_reservations,
        price_range=location.price_range,
        cover_img_url=location.cover_img_url,
        plan=is_location_featured_now(location) or "gratis",
        featured_banner_url=location.featured_banner_url,
        is_verified=location.is_verified,
        event_count=event_count,
    )


def _sync_gastro_types(session: Session, location_id: UUID, gastro_types: list[str]) -> None:
    """Replace completo: borra los tipos existentes y crea los nuevos —
    mismo patrón que _sync_event_categories."""
    session.exec(delete(LocationGastroType).where(LocationGastroType.location_id == location_id))
    for gastro_type in gastro_types:
        session.add(LocationGastroType(location_id=location_id, gastro_type=gastro_type))


def _validate_gastro_types_active(session: Session, gastro_types: list[str]) -> None:
    """Etapa 12a: valida que cada tipo exista y esté activo en
    gastro_types_catalog. Reemplaza el chequeo contra la constante
    GASTRO_TYPES hardcodeada que vivía en app.schemas.location — acá sí hay
    sesión de DB disponible."""
    active_keys = get_active_gastro_type_keys(session)
    invalid = [t for t in gastro_types if t not in active_keys]
    if invalid:
        raise ValueError(f"Tipo gastronómico inválido: {invalid[0]}")


def list_public_gastro_places(
    session: Session,
    *,
    city_id: UUID,
    gastro_type: str | None = None,
    search: str | None = None,
    has_delivery: bool | None = None,
    has_reservations: bool | None = None,
    price_range: str | None = None,
) -> list[LocationGastroRead]:
    stmt = (
        select(Location)
        .where(
            Location.city_id == city_id,
            Location.is_gastro == True,  # noqa: E712
            Location.is_active == True,  # noqa: E712
            Location.is_public == True,  # noqa: E712
        )
        .options(*_GASTRO_LOAD_OPTIONS)
    )
    if gastro_type:
        type_subq = select(LocationGastroType.location_id).where(
            LocationGastroType.location_id == Location.id,
            LocationGastroType.gastro_type == gastro_type,
        )
        stmt = stmt.where(type_subq.exists())
    if search:
        stmt = stmt.where(
            (Location.name.ilike(f"%{search}%")) | (Location.description.ilike(f"%{search}%"))
        )
    if has_delivery is not None:
        stmt = stmt.where(Location.has_delivery == has_delivery)
    if has_reservations is not None:
        stmt = stmt.where(Location.has_reservations == has_reservations)
    if price_range is not None:
        stmt = stmt.where(Location.price_range == price_range)
    stmt = stmt.order_by(_featured_order_rank(datetime.now(timezone.utc)), Location.name.asc())

    locations = list(session.exec(stmt).all())
    counts = _gastro_event_counts(session, [loc.id for loc in locations])
    return [_to_gastro_read(loc, counts.get(loc.id, 0)) for loc in locations]


def get_gastro_place(session: Session, location_id: UUID) -> LocationGastroRead:
    stmt = select(Location).where(Location.id == location_id).options(*_GASTRO_LOAD_OPTIONS)
    location = session.exec(stmt).first()
    if (
        location is None
        or not location.is_gastro
        or not location.is_active
        or not location.is_public
    ):
        raise LookupError("Lugar gastronómico no encontrado")
    count = _gastro_event_counts(session, [location.id]).get(location.id, 0)
    return _to_gastro_read(location, count)


# ── Etapa "Unificar panel admin de Lugares" ────────────────────────────────


def _to_admin_read(location: Location, event_count: int) -> LocationAdminRead:
    return LocationAdminRead(
        **_to_gastro_read(location, event_count).model_dump(),
        is_active=location.is_active,
        is_gastro=location.is_gastro,
        is_public=location.is_public,
        place_type=location.place_type,
        created_at=location.created_at,
        configured_plan=location.plan,
        featured_from=location.featured_from,
        featured_until=location.featured_until,
    )


def _admin_read(session: Session, location: Location) -> LocationAdminRead:
    count = _event_counts(session, [location.id]).get(location.id, 0)
    return _to_admin_read(location, count)


def _gastro_type_groups(session: Session, gastro_types: list[str]) -> set[str]:
    """Grupos del catálogo ("gastro"/"espacios") a los que pertenecen los
    tipos asignados — incluye tipos desactivados (eliminación lógica: el
    lugar los conserva)."""
    if not gastro_types:
        return set()
    rows = session.exec(
        select(GastroTypeCatalog.grupo).where(GastroTypeCatalog.key.in_(gastro_types))
    )
    return set(rows)


def _apply_gastro_type_rules(session: Session, location: Location, gastro_types: list[str]) -> None:
    """Deriva is_gastro de los tipos asignados y resetea los campos que no
    aplican al grupo, para que un lugar que deja de ser gastronómico no
    arrastre datos invisibles en el admin:
    - sin tipos: no aparece en Gastronomía/Espacios (is_gastro=False), plan
      vuelve a "gratis" y se borran los horarios estructurados;
    - sin tipo del grupo "gastro": se borran precio/delivery/reservas.
    La portada (cover_img_url) no se toca acá — borrarla implica storage y
    la UI solo la muestra con un tipo de Gastronomía (ver a_revisar.md)."""
    groups = _gastro_type_groups(session, gastro_types)
    location.is_gastro = bool(gastro_types)
    if not location.is_gastro:
        if location.featured_banner_url:
            delete_featured_banner(location.featured_banner_url, location.id)
            location.featured_banner_url = None
        location.plan = "gratis"
        location.featured_until = None
        location.featured_from = None
        location.opening_hours = None
    if "gastro" not in groups:
        location.price_range = None
        location.has_delivery = False
        location.has_reservations = False


def list_admin_locations(
    session: Session,
    *,
    city_id: UUID | None = None,
    is_active: bool | None = None,
    is_public: bool | None = None,
    is_verified: bool | None = None,
    grupo: str | None = None,
    search: str | None = None,
    limit: int = 200,
    offset: int = 0,
) -> list[LocationAdminRead]:
    """Todos los Location (públicos o no, activos o no) para el panel admin
    unificado. `grupo`: "gastro"/"espacios" = tiene algún tipo de ese grupo;
    "none" = sin ningún tipo (solo venue de eventos)."""
    stmt = select(Location).options(*_GASTRO_LOAD_OPTIONS)
    if city_id is not None:
        stmt = stmt.where(Location.city_id == city_id)
    if is_active is not None:
        stmt = stmt.where(Location.is_active == is_active)
    if is_public is not None:
        stmt = stmt.where(Location.is_public == is_public)
    if is_verified is not None:
        stmt = stmt.where(Location.is_verified == is_verified)
    if search:
        stmt = stmt.where(
            (Location.name.ilike(f"%{search}%")) | (Location.address.ilike(f"%{search}%"))
        )
    if grupo == "none":
        any_type = select(LocationGastroType.location_id).where(
            LocationGastroType.location_id == Location.id
        )
        stmt = stmt.where(~any_type.exists())
    elif grupo is not None:
        grupo_type = (
            select(LocationGastroType.location_id)
            .join(GastroTypeCatalog, GastroTypeCatalog.key == LocationGastroType.gastro_type)
            .where(LocationGastroType.location_id == Location.id, GastroTypeCatalog.grupo == grupo)
        )
        stmt = stmt.where(grupo_type.exists())
    stmt = (
        stmt.order_by(_featured_order_rank(datetime.now(timezone.utc)), Location.name.asc())
        .offset(offset)
        .limit(limit)
    )

    locations = list(session.exec(stmt).all())
    counts = _event_counts(session, [loc.id for loc in locations])
    return [_to_admin_read(loc, counts.get(loc.id, 0)) for loc in locations]


def create_admin_location(session: Session, data: LocationAdminCreate) -> LocationAdminRead:
    city = session.get(City, data.city_id)
    if city is None:
        raise LookupError("Ciudad no encontrada")

    _validate_gastro_types_active(session, data.gastro_types)

    location = Location(
        **data.model_dump(exclude={"gastro_types", "name", "address"}),
        name=data.name.strip(),
        address=data.address.strip(),
        plan="gratis",  # forzado, no viene del payload
        is_public=True,  # el admin solo crea lugares públicos desde acá
        is_active=True,
    )
    _apply_gastro_type_rules(session, location, data.gastro_types)
    session.add(location)
    session.flush()
    _sync_gastro_types(session, location.id, data.gastro_types)
    session.commit()
    session.refresh(location)
    return _to_admin_read(location, 0)


def update_admin_location(
    session: Session, location_id: UUID, data: LocationAdminUpdate
) -> LocationAdminRead:
    location = session.get(Location, location_id)
    if location is None:
        raise LookupError("Lugar no encontrado")

    updates = data.model_dump(exclude_unset=True, exclude={"gastro_types"})
    if "city_id" in updates and updates["city_id"] is not None:
        city = session.get(City, updates["city_id"])
        if city is None:
            raise LookupError("Ciudad no encontrada")

    if data.gastro_types is not None:
        _validate_gastro_types_active(session, data.gastro_types)
        gastro_types = data.gastro_types
    else:
        gastro_types = [t.gastro_type for t in location.gastro_types]

    for field, value in updates.items():
        setattr(location, field, value)
    _apply_gastro_type_rules(session, location, gastro_types)

    if data.gastro_types is not None:
        _sync_gastro_types(session, location.id, data.gastro_types)

    session.add(location)
    session.commit()
    session.refresh(location)
    return _admin_read(session, location)


def verify_location(session: Session, location_id: UUID, is_verified: bool) -> LocationAdminRead:
    location = session.get(Location, location_id)
    if location is None:
        raise LookupError("Lugar no encontrado")

    location.is_verified = is_verified
    session.add(location)
    session.commit()
    session.refresh(location)
    return _admin_read(session, location)


def delete_admin_location(session: Session, location_id: UUID) -> None:
    """Bloquea el borrado si el lugar tiene CUALQUIER evento asociado (no solo
    futuros): Event.location_id es FK, borrar con eventos pasados rompería la
    integridad referencial."""
    location = session.get(Location, location_id)
    if location is None:
        raise LookupError("Lugar no encontrado")

    event_count = session.exec(
        select(func.count(Event.id)).where(Event.location_id == location_id)
    ).one()
    if event_count > 0:
        raise ValueError(
            f"Este lugar tiene {event_count} evento(s) asociado(s). "
            "Reasigná los eventos antes de eliminarlo."
        )

    if location.cover_img_url:
        delete_cover(location.cover_img_url, location.id)

    session.exec(delete(LocationGastroType).where(LocationGastroType.location_id == location_id))
    session.delete(location)
    session.commit()


def _date_to_utc_datetime(value: date) -> datetime:
    return datetime(value.year, value.month, value.day, tzinfo=timezone.utc)


def set_gastro_plan(
    session: Session,
    location_id: UUID,
    plan: str,
    *,
    featured_from: date | None = None,
    featured_until: date | None = None,
) -> LocationAdminRead:
    """Cambia el plan de visibilidad de un lugar (cualquier grupo con algún
    tipo de catálogo asignado — is_gastro=True, no solo "gastro" en sentido
    estricto: ver a_revisar.md). Al pasar a "dest"/"pro" sin fechas
    explícitas, default a hoy / hoy+30 días (mismo default que antes de
    poder elegirlas desde el admin). El banner (`featured_banner_url`) solo
    tiene sentido en "pro": al bajar a "dest"/"gratis" se borra."""
    location = session.get(Location, location_id)
    if location is None or not location.is_gastro:
        raise LookupError("Lugar gastronómico no encontrado")

    location.plan = plan
    if plan in ("dest", "pro"):
        from_date = featured_from or datetime.now(timezone.utc).date()
        until_date = featured_until or (from_date + timedelta(days=30))
        location.featured_from = _date_to_utc_datetime(from_date)
        location.featured_until = _date_to_utc_datetime(until_date)
    else:
        location.featured_from = None
        location.featured_until = None

    if plan != "pro" and location.featured_banner_url:
        delete_featured_banner(location.featured_banner_url, location.id)
        location.featured_banner_url = None

    session.add(location)
    session.commit()
    session.refresh(location)
    return _admin_read(session, location)


def upload_location_featured_banner(
    session: Session,
    location_id: UUID,
    *,
    file_content: bytes,
    filename: str,
    content_type: str,
) -> str:
    location = session.get(Location, location_id)
    if location is None:
        raise LookupError("Lugar no encontrado")
    if location.plan != "pro":
        raise ValueError("El banner de Destacado Plus solo se puede subir si el plan es 'pro'")

    banner_url = upload_featured_banner(
        file_content, filename, content_type, location.id, previous_url=location.featured_banner_url
    )
    location.featured_banner_url = banner_url
    session.add(location)
    session.commit()
    return banner_url


def delete_location_featured_banner(session: Session, location_id: UUID) -> None:
    location = session.get(Location, location_id)
    if location is None:
        raise LookupError("Lugar no encontrado")

    if location.featured_banner_url:
        delete_featured_banner(location.featured_banner_url, location.id)
        location.featured_banner_url = None
        session.add(location)
        session.commit()


def _get_gastro_group_location(session: Session, location_id: UUID) -> Location:
    """La portada es un campo específico del grupo Gastronomía: requiere al
    menos un tipo del grupo "gastro"."""
    location = session.get(Location, location_id)
    if location is None or "gastro" not in _gastro_type_groups(
        session, [t.gastro_type for t in location.gastro_types]
    ):
        raise LookupError("Lugar gastronómico no encontrado")
    return location


def upload_gastro_cover(
    session: Session,
    location_id: UUID,
    *,
    file_content: bytes,
    filename: str,
    content_type: str,
) -> str:
    location = _get_gastro_group_location(session, location_id)

    # upload_cover borra la portada anterior recién después de procesar con
    # éxito la nueva (P0-4).
    cover_url = upload_cover(
        file_content, filename, content_type, location.id, previous_url=location.cover_img_url
    )
    location.cover_img_url = cover_url
    session.add(location)
    session.commit()
    return cover_url


def delete_gastro_cover(session: Session, location_id: UUID) -> None:
    location = session.get(Location, location_id)
    if location is None:
        raise LookupError("Lugar no encontrado")

    if location.cover_img_url:
        delete_cover(location.cover_img_url, location.id)
        location.cover_img_url = None
        session.add(location)
        session.commit()
