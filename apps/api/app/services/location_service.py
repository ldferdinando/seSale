from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from app.models.city import City
from app.models.event import Event
from app.models.location import Location
from app.schemas.location import (
    LocationAdminCreate,
    LocationAdminRead,
    LocationAdminUpdate,
    LocationCreate,
    LocationRead,
)

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
    """Lugares precargados (is_public=True) de una ciudad — selector del
    formulario de evento. Orden: verificados primero, luego alfabético."""
    stmt = (
        select(Location)
        .where(Location.city_id == city_id, Location.is_public == True)  # noqa: E712
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


def list_admin_locations(
    session: Session,
    *,
    city_id: UUID | None = None,
    is_public: bool | None = None,
    is_verified: bool | None = None,
    place_type: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[LocationAdminRead]:
    stmt = select(Location).options(*_LOCATION_LOAD_OPTIONS)
    if city_id is not None:
        stmt = stmt.where(Location.city_id == city_id)
    if is_public is not None:
        stmt = stmt.where(Location.is_public == is_public)
    if is_verified is not None:
        stmt = stmt.where(Location.is_verified == is_verified)
    if place_type is not None:
        stmt = stmt.where(Location.place_type == place_type)
    if search:
        stmt = stmt.where(
            (Location.name.ilike(f"%{search}%")) | (Location.address.ilike(f"%{search}%"))
        )

    locations = session.exec(stmt).all()
    locations = sorted(
        locations, key=lambda loc: (not loc.is_public, not loc.is_verified, loc.name.lower())
    )
    page = locations[offset : offset + limit]
    counts = _event_counts(session, [loc.id for loc in page])
    return [
        LocationAdminRead(**_to_location_read(loc).model_dump(), event_count=counts.get(loc.id, 0))
        for loc in page
    ]


def create_admin_location(session: Session, data: LocationAdminCreate) -> LocationAdminRead:
    city = session.get(City, data.city_id)
    if city is None:
        raise LookupError("Ciudad no encontrada")

    location = Location(
        name=data.name.strip(),
        address=data.address.strip(),
        city_id=data.city_id,
        description=data.description,
        hours=data.hours,
        place_type=data.place_type,
        latitude=data.latitude,
        longitude=data.longitude,
        is_verified=data.is_verified,
        is_public=True,  # el admin solo crea lugares públicos desde acá
    )
    session.add(location)
    session.commit()
    session.refresh(location)
    return LocationAdminRead(**_to_location_read(location).model_dump(), event_count=0)


def update_admin_location(
    session: Session, location_id: UUID, data: LocationAdminUpdate
) -> LocationAdminRead:
    location = session.get(Location, location_id)
    if location is None:
        raise LookupError("Lugar no encontrado")

    updates = data.model_dump(exclude_unset=True)
    if "city_id" in updates and updates["city_id"] is not None:
        city = session.get(City, updates["city_id"])
        if city is None:
            raise LookupError("Ciudad no encontrada")

    for field, value in updates.items():
        setattr(location, field, value)

    session.add(location)
    session.commit()
    session.refresh(location)
    count = _event_counts(session, [location.id]).get(location.id, 0)
    return LocationAdminRead(**_to_location_read(location).model_dump(), event_count=count)


def verify_location(session: Session, location_id: UUID, is_verified: bool) -> LocationAdminRead:
    location = session.get(Location, location_id)
    if location is None:
        raise LookupError("Lugar no encontrado")

    location.is_verified = is_verified
    session.add(location)
    session.commit()
    session.refresh(location)
    count = _event_counts(session, [location.id]).get(location.id, 0)
    return LocationAdminRead(**_to_location_read(location).model_dump(), event_count=count)


def delete_admin_location(session: Session, location_id: UUID) -> None:
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

    session.delete(location)
    session.commit()
