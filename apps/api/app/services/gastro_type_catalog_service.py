from uuid import UUID

from sqlmodel import Session, func, select

from app.core.timezone import argentina_today
from app.models.event import Event, EventStatus
from app.models.gastro_type_catalog import GastroTypeCatalog
from app.models.location import Location
from app.models.location_gastro_type import LocationGastroType
from app.schemas.gastro_type_catalog import GastroTypeCreate, GastroTypeUpdate


def list_gastro_types(session: Session, *, only_active: bool = True) -> list[GastroTypeCatalog]:
    query = select(GastroTypeCatalog)
    if only_active:
        query = query.where(GastroTypeCatalog.is_active == True)  # noqa: E712
    query = query.order_by(GastroTypeCatalog.sort_order.asc(), GastroTypeCatalog.name.asc())
    return list(session.exec(query))


def list_admin_gastro_types(session: Session, *, is_active: bool | None = None) -> list[GastroTypeCatalog]:
    query = select(GastroTypeCatalog)
    if is_active is not None:
        query = query.where(GastroTypeCatalog.is_active == is_active)
    query = query.order_by(GastroTypeCatalog.sort_order.asc(), GastroTypeCatalog.name.asc())
    return list(session.exec(query))


def get_active_gastro_type_keys(session: Session) -> set[str]:
    """Usado por la validación de LocationGastroCreate/Update (schemas/location.py) —
    reemplaza la constante GASTRO_TYPES hardcodeada que existía hasta la
    Etapa 12a."""
    rows = session.exec(
        select(GastroTypeCatalog.key).where(GastroTypeCatalog.is_active == True)  # noqa: E712
    )
    return set(rows)


def create_gastro_type(session: Session, data: GastroTypeCreate) -> GastroTypeCatalog:
    existing = session.exec(select(GastroTypeCatalog).where(GastroTypeCatalog.key == data.key)).first()
    if existing is not None:
        raise ValueError(f"Ya existe un tipo gastronómico con key '{data.key}'")
    gastro_type = GastroTypeCatalog(**data.model_dump())
    session.add(gastro_type)
    session.commit()
    session.refresh(gastro_type)
    return gastro_type


def update_gastro_type(session: Session, gastro_type_id: UUID, data: GastroTypeUpdate) -> GastroTypeCatalog:
    gastro_type = session.get(GastroTypeCatalog, gastro_type_id)
    if gastro_type is None:
        raise LookupError("Tipo gastronómico no encontrado")
    for field, value in data.model_dump().items():
        setattr(gastro_type, field, value)
    session.add(gastro_type)
    session.commit()
    session.refresh(gastro_type)
    return gastro_type


def _count_future_active_events_for_gastro_type(session: Session, key: str) -> int:
    today = argentina_today()
    query = (
        select(func.count())
        .select_from(LocationGastroType)
        .join(Location, LocationGastroType.location_id == Location.id)
        .join(Event, Event.location_id == Location.id)
        .where(
            LocationGastroType.gastro_type == key,
            Event.date >= today,
            Event.status == EventStatus.approved,
            Event.is_active == True,  # noqa: E712
        )
    )
    return session.exec(query).one()


def toggle_gastro_type(session: Session, gastro_type_id: UUID) -> GastroTypeCatalog:
    gastro_type = session.get(GastroTypeCatalog, gastro_type_id)
    if gastro_type is None:
        raise LookupError("Tipo gastronómico no encontrado")

    if gastro_type.is_active:
        count = _count_future_active_events_for_gastro_type(session, gastro_type.key)
        if count > 0:
            raise ValueError(
                f"Este tipo gastronómico tiene {count} evento(s) futuro(s) activos en sus lugares. "
                "No se puede desactivar."
            )
        gastro_type.is_active = False
    else:
        gastro_type.is_active = True

    session.add(gastro_type)
    session.commit()
    session.refresh(gastro_type)
    return gastro_type
