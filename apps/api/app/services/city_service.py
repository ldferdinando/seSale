from uuid import UUID

from sqlalchemy import func
from sqlmodel import Session, select

from app.core.timezone import argentina_today
from app.models.city import City
from app.models.event import Event, EventStatus
from app.services.ad_service import ensure_base_ad_slots_for_city, ensure_category_ad_slots


def list_active_cities(session: Session) -> list[City]:
    stmt = select(City).where(City.is_active == True).order_by(City.sort_order)  # noqa: E712
    return list(session.exec(stmt))


def list_all_cities_with_active_event_counts(session: Session) -> list[tuple[City, int]]:
    """Etapa 8a — todas las ciudades (activas e inactivas), para el panel
    admin. Devuelve, por cada ciudad, la cantidad de eventos aprobados y
    activos con fecha futura (mismo criterio que `_count_active_future_events`,
    usado como contexto antes de deshabilitar)."""
    cities = list(session.exec(select(City).order_by(City.sort_order)))
    return [(city, count_active_future_events(session, city.id)) for city in cities]


def count_active_future_events(session: Session, city_id: UUID) -> int:
    today = argentina_today()
    stmt = select(func.count()).select_from(Event).where(
        Event.city_id == city_id,
        Event.status == EventStatus.approved,
        Event.is_active == True,  # noqa: E712
        Event.date >= today,
    )
    return session.exec(stmt).one()


def toggle_city_active(session: Session, city_id: UUID) -> City:
    """Alterna `is_active`. Deshabilitar (True → False) se rechaza si la
    ciudad tiene eventos aprobados, activos y con fecha futura. Habilitar
    (False → True) siempre se permite."""
    city = session.get(City, city_id)
    if city is None:
        raise LookupError("Ciudad no encontrada")

    if city.is_active:
        count = count_active_future_events(session, city_id)
        if count > 0:
            raise ValueError(
                f"Esta ciudad tiene {count} evento(s) activo(s). "
                "Desactivá o reasigná los eventos antes de deshabilitar la ciudad."
            )
        city.is_active = False
        session.add(city)
        session.commit()
        session.refresh(city)
        return city

    city.is_active = True
    session.add(city)
    session.commit()
    session.refresh(city)

    # Etapa 13b — banners: al activar una ciudad, crea sus slots base
    # (eventos/eventos-grid/gastronomia/categoria-wide general) y los slots
    # de cada categoría ya activa, igual que si hubiera pasado por seed.py /
    # create_category. Idempotente. Import local para evitar import
    # circular (category_catalog_service ya importa de este módulo).
    from app.services.category_catalog_service import list_categories

    ensure_base_ad_slots_for_city(session, city.id)
    active_category_keys = [c.key for c in list_categories(session, only_active=True)]
    for key in active_category_keys:
        ensure_category_ad_slots(session, key, [city.id])

    return city


def update_city_sort_order(session: Session, city_id: UUID, sort_order: int) -> City:
    city = session.get(City, city_id)
    if city is None:
        raise LookupError("Ciudad no encontrada")

    city.sort_order = sort_order
    session.add(city)
    session.commit()
    session.refresh(city)
    return city
