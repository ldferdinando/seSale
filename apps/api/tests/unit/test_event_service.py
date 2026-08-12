from datetime import date, datetime, time, timedelta, timezone
from uuid import uuid4

import pytest
from sqlmodel import Session

from app.core.security import hash_password
from app.models import City, Event, EventCategory, EventMoment, EventStatus, Location, PlanType, User
from app.schemas.event import EventUpdate
from app.services.event_service import (
    create_event,
    delete_event,
    get_event_detail,
    get_events_for_organizer,
    list_admin_events,
    list_public_events,
    update_event,
    update_event_status,
)

TODAY = date(2026, 1, 15)


def _make_event(
    session: Session,
    *,
    city: City,
    organizer: User,
    location: Location,
    title: str,
    plan: PlanType = PlanType.gratis,
    status: EventStatus = EventStatus.approved,
    is_active: bool = True,
    is_featured: bool = False,
    category: str = "musica",
    event_date: date = TODAY,
    created_at: datetime | None = None,
) -> Event:
    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title=title,
        date=event_date,
        time=time(21, 0),
        status=status,
        plan=plan,
        is_active=is_active,
        is_featured=is_featured,
        created_at=created_at or datetime.now(timezone.utc),
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    session.add(EventCategory(event_id=event.id, category=category))
    session.commit()
    session.refresh(event)
    return event


def test_orders_pro_before_dest_before_gratis(session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="gratis-1", plan=PlanType.gratis)
    _make_event(session, city=city, organizer=organizer, location=location, title="pro-1", plan=PlanType.pro)
    _make_event(session, city=city, organizer=organizer, location=location, title="dest-1", plan=PlanType.dest)

    result = list_public_events(session, today=TODAY)

    assert [e.title for e in result] == ["pro-1", "dest-1", "gratis-1"]


def test_orders_featured_before_non_featured_within_same_plan(session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="pro-plain", plan=PlanType.pro, is_featured=False)
    _make_event(session, city=city, organizer=organizer, location=location, title="pro-feat", plan=PlanType.pro, is_featured=True)
    _make_event(session, city=city, organizer=organizer, location=location, title="dest-plain", plan=PlanType.dest, is_featured=False)
    _make_event(session, city=city, organizer=organizer, location=location, title="dest-feat", plan=PlanType.dest, is_featured=True)
    _make_event(session, city=city, organizer=organizer, location=location, title="gratis-plain", plan=PlanType.gratis, is_featured=False)
    _make_event(session, city=city, organizer=organizer, location=location, title="gratis-feat", plan=PlanType.gratis, is_featured=True)

    result = list_public_events(session, today=TODAY)

    assert [e.title for e in result] == [
        "pro-feat",
        "pro-plain",
        "dest-feat",
        "dest-plain",
        "gratis-feat",
        "gratis-plain",
    ]


def test_ordering_is_kept_when_filters_are_active(session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="pro", plan=PlanType.pro, category="musica")
    _make_event(session, city=city, organizer=organizer, location=location, title="dest", plan=PlanType.dest, category="musica")
    _make_event(session, city=city, organizer=organizer, location=location, title="gratis", plan=PlanType.gratis, category="musica")
    _make_event(session, city=city, organizer=organizer, location=location, title="other-category", plan=PlanType.pro, category="teatro")

    result = list_public_events(session, today=TODAY, categories=["musica"])

    assert [e.title for e in result] == ["pro", "dest", "gratis"]


def test_ties_within_same_plan_order_by_created_at_desc(session, city, organizer, location):
    older = datetime(2026, 1, 1, tzinfo=timezone.utc)
    newer = datetime(2026, 1, 10, tzinfo=timezone.utc)
    _make_event(session, city=city, organizer=organizer, location=location, title="older", plan=PlanType.dest, created_at=older)
    _make_event(session, city=city, organizer=organizer, location=location, title="newer", plan=PlanType.dest, created_at=newer)

    result = list_public_events(session, today=TODAY)

    assert [e.title for e in result] == ["newer", "older"]


def test_excludes_non_approved_events(session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="pending", status=EventStatus.pending)
    _make_event(session, city=city, organizer=organizer, location=location, title="rejected", status=EventStatus.rejected)
    _make_event(session, city=city, organizer=organizer, location=location, title="approved", status=EventStatus.approved)

    result = list_public_events(session, today=TODAY)

    assert [e.title for e in result] == ["approved"]


def test_excludes_inactive_events(session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="inactive", is_active=False)
    _make_event(session, city=city, organizer=organizer, location=location, title="active", is_active=True)

    result = list_public_events(session, today=TODAY)

    assert [e.title for e in result] == ["active"]


def test_excludes_past_events(session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="past", event_date=TODAY - timedelta(days=1))
    _make_event(session, city=city, organizer=organizer, location=location, title="today", event_date=TODAY)
    _make_event(session, city=city, organizer=organizer, location=location, title="future", event_date=TODAY + timedelta(days=5))

    result = list_public_events(session, today=TODAY)

    assert {e.title for e in result} == {"today", "future"}


def test_filters_by_city_id(session, organizer, location):
    city_a = City(name="General Roca", province="Río Negro", is_active=True)
    city_b = City(name="Cipolletti", province="Río Negro", is_active=True)
    session.add(city_a)
    session.add(city_b)
    session.commit()
    session.refresh(city_a)
    session.refresh(city_b)

    _make_event(session, city=city_a, organizer=organizer, location=location, title="roca-event")
    _make_event(session, city=city_b, organizer=organizer, location=location, title="cipo-event")

    result = list_public_events(session, city_id=city_b.id, today=TODAY)

    assert [e.title for e in result] == ["cipo-event"]


def test_filters_by_category(session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="musica-event", category="musica")
    _make_event(session, city=city, organizer=organizer, location=location, title="teatro-event", category="teatro")

    result = list_public_events(session, categories=["teatro"], today=TODAY)

    assert [e.title for e in result] == ["teatro-event"]


def test_filters_by_multiple_categories_is_or(session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="musica-event", category="musica")
    _make_event(session, city=city, organizer=organizer, location=location, title="teatro-event", category="teatro")
    _make_event(session, city=city, organizer=organizer, location=location, title="feria-event", category="feria")

    result = list_public_events(session, categories=["musica", "teatro"], today=TODAY)

    assert {e.title for e in result} == {"musica-event", "teatro-event"}


def _add_moments(session: Session, event: Event, moments: list[str]) -> None:
    for moment in moments:
        session.add(EventMoment(event_id=event.id, moment=moment))
    session.commit()


def test_filters_by_moment_diurno_excludes_only_nocturno(session, city, organizer, location):
    diurno_event = _make_event(session, city=city, organizer=organizer, location=location, title="diurno-event")
    nocturno_event = _make_event(session, city=city, organizer=organizer, location=location, title="nocturno-event")
    _add_moments(session, diurno_event, ["diurno"])
    _add_moments(session, nocturno_event, ["nocturno"])

    result = list_public_events(session, moment="diurno", today=TODAY)

    assert [e.title for e in result] == ["diurno-event"]


def test_filters_by_moment_nocturno_includes_dual_events(session, city, organizer, location):
    dual_event = _make_event(session, city=city, organizer=organizer, location=location, title="dual-event")
    diurno_event = _make_event(session, city=city, organizer=organizer, location=location, title="diurno-event")
    _add_moments(session, dual_event, ["diurno", "nocturno"])
    _add_moments(session, diurno_event, ["diurno"])

    result = list_public_events(session, moment="nocturno", today=TODAY)

    assert [e.title for e in result] == ["dual-event"]


def test_filters_by_date_range(session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="near", event_date=TODAY + timedelta(days=1))
    _make_event(session, city=city, organizer=organizer, location=location, title="far", event_date=TODAY + timedelta(days=30))

    result = list_public_events(
        session,
        date_from=TODAY,
        date_to=TODAY + timedelta(days=5),
        today=TODAY,
    )

    assert [e.title for e in result] == ["near"]


def test_filters_by_search(session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="Noche de Rock")
    _make_event(session, city=city, organizer=organizer, location=location, title="Feria de Artesanos")

    result = list_public_events(session, search="rock", today=TODAY)

    assert [e.title for e in result] == ["Noche de Rock"]


def test_returns_empty_list_when_no_matches(session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="musica-event", category="musica")

    result = list_public_events(session, categories=["teatro"], today=TODAY)

    assert result == []


def _create_event_kwargs(**overrides) -> dict:
    defaults = dict(
        title="Show en el bar",
        description="Un show",
        event_date=date.today() + timedelta(days=10),
        event_time=time(21, 0),
        categories=["musica"],
        location_name="El Tinglado Bar",
        location_address="Av. Roca 1240",
    )
    defaults.update(overrides)
    return defaults


def test_create_event_sets_status_pending_and_derives_city(session, city, organizer):
    event = create_event(session, user_id=organizer.id, **_create_event_kwargs())

    assert event.status == EventStatus.pending
    assert event.organizer_id == organizer.id
    assert event.city_id == city.id
    assert event.location.name == "El Tinglado Bar"


def test_create_event_reuses_existing_location(session, city, organizer, location):
    event = create_event(
        session,
        user_id=organizer.id,
        **_create_event_kwargs(location_name=location.name, location_address=location.address),
    )

    assert event.location_id == location.id


def test_create_event_raises_for_unknown_organizer(session):
    with pytest.raises(LookupError):
        create_event(session, user_id=uuid4(), **_create_event_kwargs())


def test_create_event_raises_when_organizer_has_no_city(session):
    organizer = User(
        email="sin-ciudad@sesale.com.ar",
        hashed_password=hash_password("Password123!"),
        full_name="Sin Ciudad",
        public_name="Sin Ciudad",
    )
    session.add(organizer)
    session.commit()
    session.refresh(organizer)

    with pytest.raises(ValueError):
        create_event(session, user_id=organizer.id, **_create_event_kwargs())


def test_get_events_for_organizer_groups_by_status(session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="p", status=EventStatus.pending)
    _make_event(session, city=city, organizer=organizer, location=location, title="a", status=EventStatus.approved)
    _make_event(session, city=city, organizer=organizer, location=location, title="r", status=EventStatus.rejected)

    other_organizer = User(
        email="otro@sesale.com.ar",
        hashed_password=hash_password("Password123!"),
        full_name="Otro",
        public_name="Otro",
        city_id=city.id,
    )
    session.add(other_organizer)
    session.commit()
    session.refresh(other_organizer)
    _make_event(session, city=city, organizer=other_organizer, location=location, title="ajeno")

    grouped = get_events_for_organizer(session, organizer.id)

    assert [e.title for e in grouped[EventStatus.pending]] == ["p"]
    assert [e.title for e in grouped[EventStatus.approved]] == ["a"]
    assert [e.title for e in grouped[EventStatus.rejected]] == ["r"]


def test_get_events_for_organizer_empty_groups_when_no_events(session, organizer):
    grouped = get_events_for_organizer(session, organizer.id)

    assert grouped[EventStatus.pending] == []
    assert grouped[EventStatus.approved] == []
    assert grouped[EventStatus.rejected] == []


def test_update_event_status_approves_event(session, city, organizer, location):
    event = _make_event(session, city=city, organizer=organizer, location=location, title="p", status=EventStatus.pending)

    updated = update_event_status(session, event.id, EventStatus.approved)

    assert updated.status == EventStatus.approved


def test_update_event_status_raises_for_unknown_event(session):
    with pytest.raises(LookupError):
        update_event_status(session, uuid4(), EventStatus.approved)


def test_get_event_detail_returns_approved_event_for_anonymous(session, city, organizer, location):
    event = _make_event(session, city=city, organizer=organizer, location=location, title="p", status=EventStatus.approved)

    result = get_event_detail(session, event.id, None)

    assert result.id == event.id
    assert result.organizer.public_name == organizer.public_name
    assert result.city.name == city.name


def test_get_event_detail_raises_for_pending_and_anonymous(session, city, organizer, location):
    event = _make_event(session, city=city, organizer=organizer, location=location, title="p", status=EventStatus.pending)

    with pytest.raises(LookupError):
        get_event_detail(session, event.id, None)


def test_get_event_detail_allows_owner_to_see_pending(session, city, organizer, location):
    event = _make_event(session, city=city, organizer=organizer, location=location, title="p", status=EventStatus.pending)

    result = get_event_detail(session, event.id, organizer)

    assert result.id == event.id


def test_get_event_detail_raises_for_other_user_on_pending(session, city, organizer, location):
    event = _make_event(session, city=city, organizer=organizer, location=location, title="p", status=EventStatus.pending)
    other = User(
        email="otro@sesale.com.ar",
        hashed_password=hash_password("Password123!"),
        full_name="Otro",
        public_name="Otro",
        city_id=city.id,
    )
    session.add(other)
    session.commit()
    session.refresh(other)

    with pytest.raises(LookupError):
        get_event_detail(session, event.id, other)


def test_get_event_detail_raises_for_unknown_event(session):
    with pytest.raises(LookupError):
        get_event_detail(session, uuid4(), None)


def test_update_event_by_owner_sets_status_pending(session, city, organizer, location):
    event = _make_event(session, city=city, organizer=organizer, location=location, title="p", status=EventStatus.approved)

    updated = update_event(session, event.id, organizer, EventUpdate(title="Nuevo título"))

    assert updated.title == "Nuevo título"
    assert updated.status == EventStatus.pending


def test_update_event_by_admin_keeps_status(session, city, organizer, location):
    event = _make_event(session, city=city, organizer=organizer, location=location, title="p", status=EventStatus.approved)
    admin = User(
        email="admin@sesale.com.ar",
        hashed_password=hash_password("AdminPass123!"),
        role="admin",
        full_name="Admin",
        public_name="Admin",
        city_id=city.id,
    )
    session.add(admin)
    session.commit()
    session.refresh(admin)

    updated = update_event(session, event.id, admin, EventUpdate(title="Editado admin"))

    assert updated.title == "Editado admin"
    assert updated.status == EventStatus.approved


def test_update_event_by_other_user_raises_permission_error(session, city, organizer, location):
    event = _make_event(session, city=city, organizer=organizer, location=location, title="p")
    other = User(
        email="otro@sesale.com.ar",
        hashed_password=hash_password("Password123!"),
        full_name="Otro",
        public_name="Otro",
        city_id=city.id,
    )
    session.add(other)
    session.commit()
    session.refresh(other)

    with pytest.raises(PermissionError):
        update_event(session, event.id, other, EventUpdate(title="Hackeado"))


def test_update_event_raises_for_unknown_event(session, organizer):
    with pytest.raises(LookupError):
        update_event(session, uuid4(), organizer, EventUpdate(title="X"))


def test_create_event_with_organizer_id_by_admin_uses_that_organizer(session, city, organizer, admin):
    event = create_event(
        session,
        user_id=admin.id,
        title="Cargado por admin",
        description=None,
        event_date=TODAY + timedelta(days=10),
        event_time=time(21, 0),
        categories=["musica"],
        location_name="Nuevo lugar",
        location_address="Calle Falsa 123",
        organizer_id=organizer.id,
        is_admin=True,
    )

    assert event.organizer_id == organizer.id


def test_create_event_ignores_organizer_id_for_non_admin(session, city, organizer, admin):
    event = create_event(
        session,
        user_id=organizer.id,
        title="Evento propio",
        description=None,
        event_date=TODAY + timedelta(days=10),
        event_time=time(21, 0),
        categories=["musica"],
        location_name="Nuevo lugar",
        location_address="Calle Falsa 123",
        organizer_id=admin.id,
        is_admin=False,
    )

    assert event.organizer_id == organizer.id


def test_delete_event_by_owner_soft_deletes(session, city, organizer, location):
    event = _make_event(session, city=city, organizer=organizer, location=location, title="a-borrar")

    deleted = delete_event(session, event.id, organizer)

    assert deleted.is_active is False


def test_delete_event_by_admin_soft_deletes(session, city, organizer, location, admin):
    event = _make_event(session, city=city, organizer=organizer, location=location, title="a-borrar")

    deleted = delete_event(session, event.id, admin)

    assert deleted.is_active is False


def test_delete_event_by_other_user_raises_permission_error(session, city, organizer, location):
    other = User(
        email="otro-delete@sesale.com.ar",
        hashed_password=hash_password("Password123!"),
        full_name="Otro",
        public_name="Otro",
        city_id=city.id,
    )
    session.add(other)
    session.commit()
    session.refresh(other)

    event = _make_event(session, city=city, organizer=organizer, location=location, title="a-borrar")

    with pytest.raises(PermissionError):
        delete_event(session, event.id, other)


def test_delete_event_raises_for_unknown_event(session, organizer):
    with pytest.raises(LookupError):
        delete_event(session, uuid4(), organizer)


def test_list_admin_events_returns_all_statuses(session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="p", status=EventStatus.pending)
    _make_event(session, city=city, organizer=organizer, location=location, title="a", status=EventStatus.approved)
    _make_event(session, city=city, organizer=organizer, location=location, title="r", status=EventStatus.rejected)

    events = list_admin_events(session)

    assert {e.title for e in events} == {"p", "a", "r"}


def test_list_admin_events_orders_pending_first(session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="approved-1", status=EventStatus.approved)
    _make_event(session, city=city, organizer=organizer, location=location, title="pending-1", status=EventStatus.pending)

    events = list_admin_events(session)

    assert events[0].title == "pending-1"


def test_list_admin_events_filters_by_status(session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="p", status=EventStatus.pending)
    _make_event(session, city=city, organizer=organizer, location=location, title="a", status=EventStatus.approved)

    events = list_admin_events(session, status=EventStatus.pending)

    assert {e.title for e in events} == {"p"}


def test_list_admin_events_includes_inactive(session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="inactivo", is_active=False)

    events = list_admin_events(session)

    assert any(e.title == "inactivo" for e in events)
