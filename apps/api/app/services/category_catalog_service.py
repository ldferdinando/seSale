from uuid import UUID

from sqlmodel import Session, func, select

from app.core.timezone import argentina_today
from app.models.category import EventCategory
from app.models.event import Event, EventStatus
from app.models.event_category_catalog import EventCategoryCatalog
from app.schemas.category_catalog import CategoryCreate, CategoryUpdate
from app.services.ad_service import ensure_category_ad_slots
from app.services.city_service import list_active_cities


def list_categories(session: Session, *, only_active: bool = True) -> list[EventCategoryCatalog]:
    query = select(EventCategoryCatalog)
    if only_active:
        query = query.where(EventCategoryCatalog.is_active == True)  # noqa: E712
    query = query.order_by(EventCategoryCatalog.sort_order.asc(), EventCategoryCatalog.name.asc())
    return list(session.exec(query))


def list_admin_categories(session: Session, *, is_active: bool | None = None) -> list[EventCategoryCatalog]:
    query = select(EventCategoryCatalog)
    if is_active is not None:
        query = query.where(EventCategoryCatalog.is_active == is_active)
    query = query.order_by(EventCategoryCatalog.sort_order.asc(), EventCategoryCatalog.name.asc())
    return list(session.exec(query))


def get_active_category_keys(session: Session) -> set[str]:
    """Usado por la validación de EventCreate/EventUpdate (schemas/event.py) —
    reemplaza el set VALID_CATEGORIES hardcodeado que existía hasta la
    Etapa 12a."""
    rows = session.exec(
        select(EventCategoryCatalog.key).where(EventCategoryCatalog.is_active == True)  # noqa: E712
    )
    return set(rows)


def create_category(session: Session, data: CategoryCreate) -> EventCategoryCatalog:
    existing = session.exec(select(EventCategoryCatalog).where(EventCategoryCatalog.key == data.key)).first()
    if existing is not None:
        raise ValueError(f"Ya existe una categoría con key '{data.key}'")
    category = EventCategoryCatalog(**data.model_dump())
    session.add(category)
    session.commit()
    session.refresh(category)

    # Etapa 13b — banners de categoría: cada categoría nueva necesita sus
    # propios slots (2 categoria-wide + 2 categoria-grid) en cada ciudad
    # activa, para que el admin ya los tenga disponibles al cargar
    # anunciantes. Idempotente (ensure_category_ad_slots no duplica).
    active_city_ids = [city.id for city in list_active_cities(session)]
    ensure_category_ad_slots(session, category.key, active_city_ids)

    return category


def update_category(session: Session, category_id: UUID, data: CategoryUpdate) -> EventCategoryCatalog:
    category = session.get(EventCategoryCatalog, category_id)
    if category is None:
        raise LookupError("Categoría no encontrada")
    for field, value in data.model_dump().items():
        setattr(category, field, value)
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


def _count_future_active_events_for_category(session: Session, key: str) -> int:
    today = argentina_today()
    query = (
        select(func.count())
        .select_from(EventCategory)
        .join(Event, EventCategory.event_id == Event.id)
        .where(
            EventCategory.category == key,
            Event.date >= today,
            Event.status == EventStatus.approved,
            Event.is_active == True,  # noqa: E712
        )
    )
    return session.exec(query).one()


def count_future_events_by_category(session: Session, city_id: UUID) -> dict[str, int]:
    """Cantidad de eventos aprobados, activos y futuros (``date >= hoy`` en hora
    Argentina) por categoría activa, para la ciudad dada. Devuelve una entrada
    por cada categoría activa (``0`` incluido). Usado por la grilla de
    ``/categorias`` (Etapa 13a)."""
    today = argentina_today()
    rows = session.exec(
        select(EventCategory.category, func.count())
        .join(Event, EventCategory.event_id == Event.id)
        .where(
            Event.city_id == city_id,
            Event.date >= today,
            Event.status == EventStatus.approved,
            Event.is_active == True,  # noqa: E712
        )
        .group_by(EventCategory.category)
    )
    raw_counts = {category: count for category, count in rows}
    active_keys = [c.key for c in list_categories(session, only_active=True)]
    return {key: raw_counts.get(key, 0) for key in active_keys}


def toggle_category(session: Session, category_id: UUID) -> EventCategoryCatalog:
    category = session.get(EventCategoryCatalog, category_id)
    if category is None:
        raise LookupError("Categoría no encontrada")

    if category.is_active:
        count = _count_future_active_events_for_category(session, category.key)
        if count > 0:
            raise ValueError(
                f"Esta categoría tiene {count} evento(s) futuro(s) activos. No se puede desactivar."
            )
        category.is_active = False
    else:
        category.is_active = True

    session.add(category)
    session.commit()
    session.refresh(category)
    return category
