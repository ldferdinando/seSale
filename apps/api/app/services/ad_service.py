"""Etapa 8d — banners completos: listado público/admin de AdSlot+AdItem,
ABM de AdItem, subida de imagen y reorder. Ver ARCHITECTURE.md (sección
`ad_slots`/`ad_items`) y a_revisar.md (Etapa 8d) para las reglas de negocio.
"""

from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from app.core.storage import delete_banner_if_owned, upload_banner
from app.models.ad_item import AdItem
from app.models.ad_slot import AdSlot
from app.models.user import User
from app.schemas.ad_slot import (
    AdItemAdminRead,
    AdItemCreate,
    AdItemPublicRead,
    AdItemUpdate,
    AdItemWithSlotRead,
    AdSlotAdminRead,
    AdSlotCreate,
    AdSlotRead,
)

_ITEM_LOAD_OPTIONS = (selectinload(AdSlot.items).selectinload(AdItem.user),)

# Slots base de una ciudad (category_key=None siempre) — Etapa 8d-pre (eventos/
# eventos-grid/gastronomia) + Etapa 13b (categoria-wide general, 2 slots que
# aparecen arriba del grid de /categorias). Usados por seed.py y por
# ensure_base_ad_slots_for_city (creación automática al activar una ciudad).
BASE_AD_SLOT_SPECS: list[tuple[str, int, str]] = [
    ("eventos", 0, "sequential"),
    ("eventos", 1, "sequential"),
    ("eventos", 2, "sequential"),
    ("eventos-grid", 0, "random"),
    ("eventos-grid", 1, "random"),
    ("gastronomia", 0, "sequential"),
    ("gastronomia", 1, "sequential"),
    ("gastronomia", 2, "sequential"),
    ("categoria-wide", 0, "sequential"),
    ("categoria-wide", 1, "sequential"),
]

# Slots de una categoría específica (category_key=key) — Etapa 13b: 2 banners
# wide + 2 tiles de grilla en /categorias/{key}.
_CATEGORY_AD_SLOT_SPECS: list[tuple[str, int, str]] = [
    ("categoria-wide", 0, "sequential"),
    ("categoria-wide", 1, "sequential"),
    ("categoria-grid", 0, "random"),
    ("categoria-grid", 1, "random"),
]


def _apply_category_filter(stmt, category_key: str | None):
    """Si `category_key` viene: filtra por ese valor. Si no viene: filtra
    por category_key IS NULL (banners generales) — usado tanto por el
    listado público como el de admin."""
    if category_key is None:
        return stmt.where(AdSlot.category_key.is_(None))
    return stmt.where(AdSlot.category_key == category_key)


def _self_heal_ad_slots(session: Session, *, city_id: UUID, section: str, category_key: str | None) -> None:
    """Autorepara slots faltantes antes de listarlos para el admin —
    Etapa 13b (fix): una categoría creada antes de esta etapa (o cualquier
    combinación ciudad/sección/categoría que por algún motivo se haya
    quedado sin sus AdSlot) dejaba el panel admin sin ningún slot para
    mostrar, y por lo tanto sin el botón "Agregar banner" (vive en
    AdSlotCard, que solo se renderiza si hay al menos un slot). Llama a los
    mismos `ensure_*` idempotentes que ya se usan al activar una ciudad o
    crear una categoría — no duplica nada si los slots ya existen.

    Solo aplica a las 5 secciones conocidas; no hace nada si `section` no es
    ninguna de ellas (no hay nada "esperable" que asegurar)."""
    if section in ("eventos", "eventos-grid", "gastronomia"):
        ensure_base_ad_slots_for_city(session, city_id)
    elif section == "categoria-wide" and category_key is None:
        # Los 2 slots generales de categoria-wide son parte de la base.
        ensure_base_ad_slots_for_city(session, city_id)
    elif category_key is not None:
        # categoria-wide o categoria-grid con category_key: crea el combo
        # completo de 4 slots de esa categoría (no solo la sección pedida).
        ensure_category_ad_slots(session, category_key, [city_id])
    # section == "categoria-grid" sin category_key: no hay slots generales
    # de grilla por diseño (siempre son específicos de una categoría) — nada
    # que asegurar, la lista vacía es el resultado correcto.


def _to_public_item_read(item: AdItem) -> AdItemPublicRead:
    return AdItemPublicRead(
        id=item.id,
        img_url=item.img_url,
        link_url=item.link_url,
        alt_text=item.alt_text,
        display_order=item.display_order,
    )


def _to_admin_item_read(item: AdItem) -> AdItemAdminRead:
    return AdItemAdminRead(
        **_to_public_item_read(item).model_dump(),
        advertiser_name=item.advertiser_name,
        user_id=item.user_id,
        user_public_name=item.user.public_name if item.user else "",
        starts_at=item.starts_at,
        ends_at=item.ends_at,
        status=item.status,
        created_by=item.created_by,
        created_at=item.created_at,
    )


def _is_current(item: AdItem, today: date) -> bool:
    if item.status != "active":
        return False
    if item.starts_at > today:
        return False
    if item.ends_at is not None and item.ends_at < today:
        return False
    return True


def list_public_ad_slots(
    session: Session, *, city_id: UUID, section: str, category_key: str | None = None
) -> list[AdSlotRead]:
    """AdSlot de una ciudad/sección con sus AdItem vigentes anidados (items=[]
    si no hay ninguno vigente — el frontend muestra el placeholder).

    `category_key` solo tiene efecto real para section="categoria-wide"/
    "categoria-grid" (las demás secciones siempre tienen category_key=NULL);
    si no viene, se listan los slots generales (category_key IS NULL) — si
    viene, se listan los de esa categoría puntual. Sin slots para ese key:
    lista vacía, no error."""
    today = datetime.now(timezone.utc).date()
    stmt = (
        select(AdSlot)
        .where(AdSlot.city_id == city_id, AdSlot.section == section)
        .options(*_ITEM_LOAD_OPTIONS)
        .order_by(AdSlot.slot_position.asc())
    )
    stmt = _apply_category_filter(stmt, category_key)
    slots = session.exec(stmt).all()

    result: list[AdSlotRead] = []
    for slot in slots:
        current_items = sorted(
            (item for item in slot.items if _is_current(item, today)),
            key=lambda item: item.display_order,
        )
        result.append(
            AdSlotRead(
                id=slot.id,
                city_id=slot.city_id,
                section=slot.section,
                slot_position=slot.slot_position,
                category_key=slot.category_key,
                rotation_mode=slot.rotation_mode,
                rotation_interval_seconds=slot.rotation_interval_seconds,
                is_active=slot.is_active,
                items=[_to_public_item_read(item) for item in current_items],
            )
        )
    return result


def list_admin_ad_slots(
    session: Session, *, city_id: UUID, section: str | None = None, category_key: str | None = None
) -> list[AdSlotAdminRead]:
    """Todos los AdSlot de una ciudad (con TODOS sus AdItem, no solo los
    vigentes) — el admin necesita ver el historial completo.

    `category_key` sigue la misma convención que list_public_ad_slots: si no
    viene, trae los slots generales (category_key IS NULL).

    Autorepara los slots esperables de `section` antes de listar — ver
    _self_heal_ad_slots — así el panel admin nunca queda sin el botón
    "Agregar banner" por faltar el AdSlot (bug real: categorías creadas
    antes de la Etapa 13b nunca dispararon la creación automática)."""
    if section is not None:
        _self_heal_ad_slots(session, city_id=city_id, section=section, category_key=category_key)

    stmt = select(AdSlot).where(AdSlot.city_id == city_id).options(*_ITEM_LOAD_OPTIONS)
    if section is not None:
        stmt = stmt.where(AdSlot.section == section)
        stmt = _apply_category_filter(stmt, category_key)
    slots = session.exec(stmt).all()
    slots = sorted(slots, key=lambda s: (s.section, s.slot_position))

    result: list[AdSlotAdminRead] = []
    for slot in slots:
        items = sorted(slot.items, key=lambda item: item.display_order)
        result.append(
            AdSlotAdminRead(
                id=slot.id,
                city_id=slot.city_id,
                section=slot.section,
                slot_position=slot.slot_position,
                category_key=slot.category_key,
                rotation_mode=slot.rotation_mode,
                rotation_interval_seconds=slot.rotation_interval_seconds,
                is_active=slot.is_active,
                items=[_to_admin_item_read(item) for item in items],
            )
        )
    return result


def list_admin_ad_items(
    session: Session,
    *,
    city_id: UUID | None = None,
    section: str | None = None,
    status: str | None = None,
    user_id: UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[AdItemAdminRead]:
    stmt = (
        select(AdItem)
        .join(AdSlot, AdItem.slot_id == AdSlot.id)
        .options(selectinload(AdItem.user))
        .order_by(AdItem.created_at.desc())
    )
    if city_id is not None:
        stmt = stmt.where(AdSlot.city_id == city_id)
    if section is not None:
        stmt = stmt.where(AdSlot.section == section)
    if status is not None:
        stmt = stmt.where(AdItem.status == status)
    if user_id is not None:
        stmt = stmt.where(AdItem.user_id == user_id)
    if date_from is not None:
        stmt = stmt.where(AdItem.starts_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(AdItem.starts_at <= date_to)

    items = session.exec(stmt).all()
    return [_to_admin_item_read(item) for item in items]


def get_ad_item_or_404(session: Session, ad_item_id: UUID) -> AdItem:
    item = session.get(AdItem, ad_item_id)
    if item is None:
        raise LookupError("Banner no encontrado")
    return item


def create_ad_item(session: Session, data: AdItemCreate, *, created_by: UUID) -> AdItemAdminRead:
    slot = session.get(AdSlot, data.slot_id)
    if slot is None:
        raise LookupError("Slot no encontrado")
    user = session.get(User, data.user_id)
    if user is None:
        raise LookupError("Usuario (anunciante) no encontrado")

    item = AdItem(
        slot_id=data.slot_id,
        user_id=data.user_id,
        img_url=data.img_url,
        link_url=data.link_url,
        alt_text=data.alt_text,
        advertiser_name=data.advertiser_name or user.public_name,
        starts_at=data.starts_at or datetime.now(timezone.utc).date(),
        ends_at=data.ends_at,
        display_order=data.display_order,
        created_by=created_by,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    item.user = user
    return _to_admin_item_read(item)


def update_ad_item(session: Session, ad_item_id: UUID, data: AdItemUpdate) -> AdItemAdminRead:
    item = get_ad_item_or_404(session, ad_item_id)
    updates = data.model_dump(exclude_unset=True)
    original_status = item.status
    for field, value in updates.items():
        setattr(item, field, value)

    if "status" not in updates:
        # El admin no tocó el status en este update: lo recalculamos según
        # el ends_at resultante (el nuevo valor, o el que ya tenía si no se
        # está cambiando este campo). "paused" es intencional del admin y
        # nunca se reactiva solo por extender la fecha — necesita la acción
        # explícita de reactivar (toggle_ad_item_status).
        today = datetime.now(timezone.utc).date()
        is_current = item.ends_at is None or item.ends_at >= today
        if original_status == "expired" and is_current:
            item.status = "active"
        elif original_status == "active" and not is_current:
            item.status = "expired"

    item.updated_at = datetime.now(timezone.utc)
    session.add(item)
    session.commit()
    session.refresh(item)
    return _to_admin_item_read(item)


def toggle_ad_item_status(session: Session, ad_item_id: UUID, new_status: str) -> AdItemAdminRead:
    """Alterna entre "active"/"paused" — nunca "expired" (eso lo hace
    expire_overdue_ad_items automáticamente, no este endpoint)."""
    if new_status not in ("active", "paused"):
        raise ValueError('El status solo puede ser "active" o "paused" desde este endpoint')
    item = get_ad_item_or_404(session, ad_item_id)
    item.status = new_status
    item.updated_at = datetime.now(timezone.utc)
    session.add(item)
    session.commit()
    session.refresh(item)
    return _to_admin_item_read(item)


def delete_ad_item(session: Session, ad_item_id: UUID) -> None:
    item = get_ad_item_or_404(session, ad_item_id)
    if item.img_url:
        delete_banner_if_owned(item.img_url, item.id)
    session.delete(item)
    session.commit()


async def upload_ad_item_image(
    session: Session,
    ad_item_id: UUID,
    *,
    file_content: bytes,
    filename: str,
    content_type: str,
) -> AdItemAdminRead:
    item = get_ad_item_or_404(session, ad_item_id)

    if item.img_url:
        delete_banner_if_owned(item.img_url, item.id)

    item.img_url = await upload_banner(
        file_content=file_content, filename=filename, content_type=content_type, ad_item_id=item.id
    )
    item.updated_at = datetime.now(timezone.utc)
    session.add(item)
    session.commit()
    session.refresh(item)
    return _to_admin_item_read(item)


def reorder_ad_items(session: Session, slot_id: UUID, ordered_ids: list[UUID]) -> list[AdItemAdminRead]:
    slot = session.get(AdSlot, slot_id)
    if slot is None:
        raise LookupError("Slot no encontrado")
    if slot.rotation_mode != "sequential":
        raise ValueError('Solo se pueden reordenar slots con rotation_mode="sequential"')

    items_by_id = {item.id: item for item in slot.items}
    for position, item_id in enumerate(ordered_ids):
        item = items_by_id.get(item_id)
        if item is None:
            raise LookupError(f"El banner {item_id} no pertenece a este slot")
        item.display_order = position
        item.updated_at = datetime.now(timezone.utc)
        session.add(item)

    session.commit()
    ordered_items = sorted(slot.items, key=lambda item: item.display_order)
    for item in ordered_items:
        session.refresh(item)
    return [_to_admin_item_read(item) for item in ordered_items]


def list_user_banners(session: Session, user_id: UUID) -> list[AdItemWithSlotRead]:
    """AdItem del usuario autenticado (anunciante), con la sección/posición
    de su AdSlot — el usuario necesita saber dónde aparece su banner."""
    stmt = (
        select(AdItem)
        .where(AdItem.user_id == user_id)
        .options(selectinload(AdItem.user), selectinload(AdItem.slot))
        .order_by(AdItem.starts_at.desc())
    )
    items = session.exec(stmt).all()
    return [
        AdItemWithSlotRead(
            **_to_admin_item_read(item).model_dump(),
            section=item.slot.section,
            slot_position=item.slot.slot_position,
        )
        for item in items
    ]


def ensure_base_ad_slots_for_city(session: Session, city_id: UUID) -> None:
    """Crea (si faltan) los slots base de una ciudad: 3 "eventos" + 2
    "eventos-grid" + 3 "gastronomia" + 2 "categoria-wide" generales
    (category_key=None) — ver BASE_AD_SLOT_SPECS. Idempotente: no duplica
    slots ya existentes. Se llama desde seed.py (poblado inicial) y desde
    city_service.toggle_city_active (al activar una ciudad — Etapa 13b)."""
    existing = set(
        session.exec(
            select(AdSlot.section, AdSlot.slot_position).where(
                AdSlot.city_id == city_id, AdSlot.category_key.is_(None)
            )
        ).all()
    )
    for section, position, rotation_mode in BASE_AD_SLOT_SPECS:
        if (section, position) in existing:
            continue
        spec = AdSlotCreate(
            city_id=city_id, section=section, slot_position=position, rotation_mode=rotation_mode
        )
        session.add(AdSlot(**spec.model_dump()))
    session.commit()


def ensure_category_ad_slots(session: Session, category_key: str, city_ids: list[UUID]) -> None:
    """Crea (si faltan) los 4 slots de una categoría (2 "categoria-wide" + 2
    "categoria-grid") para `category_key`, en cada ciudad de `city_ids`.
    Idempotente. Se llama desde category_catalog_service.create_category (al
    crear una categoría nueva) y desde city_service.toggle_city_active (al
    activar una ciudad, para las categorías ya activas) — Etapa 13b."""
    for city_id in city_ids:
        existing = set(
            session.exec(
                select(AdSlot.section, AdSlot.slot_position).where(
                    AdSlot.city_id == city_id, AdSlot.category_key == category_key
                )
            ).all()
        )
        for section, position, rotation_mode in _CATEGORY_AD_SLOT_SPECS:
            if (section, position) in existing:
                continue
            spec = AdSlotCreate(
                city_id=city_id,
                section=section,
                slot_position=position,
                rotation_mode=rotation_mode,
                category_key=category_key,
            )
            session.add(AdSlot(**spec.model_dump()))
    session.commit()
