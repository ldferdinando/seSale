import logging
from uuid import UUID

from sqlalchemy import func
from sqlmodel import Session, select

from app.core.timezone import argentina_today
from app.models.ad_item import AdItem
from app.models.ad_slot import AdSlot
from app.models.city import City
from app.models.event import Event, EventStatus
from app.models.location import Location
from app.models.user import User
from app.schemas.city import CityCreate
from app.services.ad_service import ensure_base_ad_slots_for_city, ensure_category_ad_slots

logger = logging.getLogger(__name__)


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


def _ensure_ad_slots_safely(session: Session, city_id: UUID) -> None:
    """Crea los ad slots base + de categorías activas para `city_id`, igual
    que `ensure_base_ad_slots_for_city`/`ensure_category_ad_slots`, pero sin
    dejar que un fallo ahí (p. ej. datos inconsistentes heredados en
    producción) rompa la acción principal (activar/crear la ciudad): esos
    slots ya se autoreparan al entrar al panel admin de Ads
    (`ad_service._self_heal_ad_slots`), así que no son críticos para poder
    activar o crear una ciudad. Bug real en prod: `toggle` de una ciudad
    devolvía 500 por una excepción acá adentro; ahora se loguea y la
    activación sigue adelante."""
    try:
        ensure_base_ad_slots_for_city(session, city_id)

        from app.services.category_catalog_service import list_categories

        active_category_keys = [c.key for c in list_categories(session, only_active=True)]
        for key in active_category_keys:
            ensure_category_ad_slots(session, key, [city_id])
    except Exception:
        session.rollback()
        logger.exception("No se pudieron crear los ad slots de la ciudad %s", city_id)


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
    # create_category. Idempotente, y no crítico (ver _ensure_ad_slots_safely):
    # un fallo ahí no debe tirar abajo la activación de la ciudad.
    _ensure_ad_slots_safely(session, city.id)
    session.refresh(city)

    return city


def create_city(session: Session, data: CityCreate) -> City:
    """Alta de ciudad desde el panel admin. `sort_order`: si no se manda,
    máximo actual + 1 (aparece al final del listado). Nace `is_active=True`
    (el admin la crea a propósito, para usarla de inmediato). Rechaza
    duplicados por `name`+`province` (case-insensitive) para evitar altas
    repetidas por error — no hay constraint de unicidad en la DB todavía,
    así que la validación es solo a nivel de aplicación."""
    existing = session.exec(
        select(City).where(
            func.lower(City.name) == data.name.strip().lower(),
            func.lower(City.province) == data.province.strip().lower(),
        )
    ).first()
    if existing is not None:
        raise ValueError(f"Ya existe una ciudad '{data.name}' en '{data.province}'")

    if data.sort_order is not None:
        sort_order = data.sort_order
    else:
        max_sort_order = session.exec(select(func.max(City.sort_order))).one()
        sort_order = (max_sort_order or 0) + 1

    city = City(
        name=data.name.strip(),
        province=data.province.strip(),
        emoji=data.emoji,
        latitude=data.latitude,
        longitude=data.longitude,
        is_active=True,
        sort_order=sort_order,
    )
    session.add(city)
    session.commit()
    session.refresh(city)

    # Mismos slots base que al activar una ciudad existente (toggle_city_active) —
    # la ciudad nace activa, así que necesita estar lista para banners desde el alta.
    _ensure_ad_slots_safely(session, city.id)

    # ensure_base_ad_slots_for_city/ensure_category_ad_slots (o el rollback
    # de _ensure_ad_slots_safely si algo falló ahí) comitean/expiran los
    # atributos de `city` en memoria — hace falta refrescarlo antes de
    # devolverlo para que el `model_dump()` del router no los encuentre
    # vacíos.
    session.refresh(city)

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


def delete_city(session: Session, city_id: UUID) -> None:
    """Borra una ciudad — pensado para corregir altas erróneas (p. ej.
    duplicados), no para dar de baja ciudades en uso. Se rechaza (409) si
    tiene CUALQUIER evento, lugar o usuario asociado, o banners (AdItem)
    publicados, sin importar que esté activa o inactiva: a diferencia de
    `toggle_city_active` (que solo mira eventos activos/futuros porque
    desactivar es reversible), borrar es irreversible y rompería esos
    registros (quedarían con un `city_id` inválido). Los AdSlot propios de
    la ciudad (infraestructura autogenerada, sin contenido si no hay
    AdItem) se borran en cascada acá mismo."""
    city = session.get(City, city_id)
    if city is None:
        raise LookupError("Ciudad no encontrada")

    events_count = session.exec(
        select(func.count()).select_from(Event).where(Event.city_id == city_id)
    ).one()
    if events_count > 0:
        raise ValueError(
            f"Esta ciudad tiene {events_count} evento(s) asociado(s). No se puede eliminar."
        )

    locations_count = session.exec(
        select(func.count()).select_from(Location).where(Location.city_id == city_id)
    ).one()
    if locations_count > 0:
        raise ValueError(
            f"Esta ciudad tiene {locations_count} lugar(es) asociado(s). No se puede eliminar."
        )

    users_count = session.exec(
        select(func.count()).select_from(User).where(User.city_id == city_id)
    ).one()
    if users_count > 0:
        raise ValueError(
            f"Esta ciudad tiene {users_count} usuario(s) asociado(s). No se puede eliminar."
        )

    ad_items_count = session.exec(
        select(func.count())
        .select_from(AdItem)
        .join(AdSlot, AdItem.slot_id == AdSlot.id)
        .where(AdSlot.city_id == city_id)
    ).one()
    if ad_items_count > 0:
        raise ValueError(
            f"Esta ciudad tiene {ad_items_count} banner(es) publicado(s). No se puede eliminar."
        )

    for slot in session.exec(select(AdSlot).where(AdSlot.city_id == city_id)):
        session.delete(slot)

    session.delete(city)
    session.commit()
