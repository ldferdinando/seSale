from datetime import date, datetime, time, timedelta, timezone
from uuid import uuid4

import pytest
from sqlmodel import Session

from app.core.security import hash_password
from app.models import City, Event, EventStatus, Location, PlanType, User
from app.services.event_service import (
    create_event,
    get_events_for_organizer,
    list_public_events,
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
        category=category,
        status=status,
        plan=plan,
        is_active=is_active,
        created_at=created_at or datetime.now(timezone.utc),
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def test_orders_pro_before_dest_before_gratis(session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="gratis-1", plan=PlanType.gratis)
    _make_event(session, city=city, organizer=organizer, location=location, title="pro-1", plan=PlanType.pro)
    _make_event(session, city=city, organizer=organizer, location=location, title="dest-1", plan=PlanType.dest)

    result = list_public_events(session, today=TODAY)

    assert [e.title for e in result] == ["pro-1", "dest-1", "gratis-1"]


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

    result = list_public_events(session, category="teatro", today=TODAY)

    assert [e.title for e in result] == ["teatro-event"]


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

    result = list_public_events(session, category="teatro", today=TODAY)

    assert result == []


def _create_event_kwargs(**overrides) -> dict:
    defaults = dict(
        title="Show en el bar",
        description="Un show",
        event_date=date.today() + timedelta(days=10),
        event_time=time(21, 0),
        category="musica",
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
