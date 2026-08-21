from datetime import date, time
from uuid import uuid4

import pytest

from app.models import City, Event, EventStatus, Location
from app.services.city_service import (
    list_active_cities,
    list_all_cities_with_active_event_counts,
    toggle_city_active,
    update_city_sort_order,
)


def test_list_active_cities_excludes_inactive(session, city):
    inactive = City(name="Ciudad Inactiva", province="Río Negro", is_active=False)
    session.add(inactive)
    session.commit()

    cities = list_active_cities(session)

    names = [c.name for c in cities]
    assert city.name in names
    assert "Ciudad Inactiva" not in names


# Etapa 8a — toggle_city_active


def test_toggle_city_active_without_events_disables_it(session, city):
    assert city.is_active is True

    updated = toggle_city_active(session, city.id)

    assert updated.is_active is False


def test_toggle_city_active_enables_it_back(session, city):
    city.is_active = False
    session.add(city)
    session.commit()

    updated = toggle_city_active(session, city.id)

    assert updated.is_active is True


def test_toggle_city_active_with_future_approved_events_raises_value_error(session, city, organizer, location):
    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title="Evento futuro",
        date=date(2999, 1, 1),
        time=time(21, 0),
        time_end=time(23, 0),
        status=EventStatus.approved,
        is_active=True,
    )
    session.add(event)
    session.commit()

    with pytest.raises(ValueError):
        toggle_city_active(session, city.id)


def test_toggle_city_active_ignores_past_events(session, city, organizer, location):
    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title="Evento pasado",
        date=date(2000, 1, 1),
        time=time(21, 0),
        time_end=time(23, 0),
        status=EventStatus.approved,
        is_active=True,
    )
    session.add(event)
    session.commit()

    updated = toggle_city_active(session, city.id)

    assert updated.is_active is False


def test_toggle_city_active_ignores_pending_events(session, city, organizer, location):
    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title="Evento pendiente",
        date=date(2999, 1, 1),
        time=time(21, 0),
        time_end=time(23, 0),
        status=EventStatus.pending,
        is_active=True,
    )
    session.add(event)
    session.commit()

    updated = toggle_city_active(session, city.id)

    assert updated.is_active is False


def test_toggle_city_active_nonexistent_raises_lookup_error(session):
    with pytest.raises(LookupError):
        toggle_city_active(session, uuid4())


# Etapa 8a — list_all_cities_with_active_event_counts


def test_list_all_cities_with_active_event_counts_includes_inactive(session, city):
    inactive = City(name="Ciudad Inactiva", province="Río Negro", is_active=False)
    session.add(inactive)
    session.commit()

    result = list_all_cities_with_active_event_counts(session)

    names = [c.name for c, _count in result]
    assert city.name in names
    assert "Ciudad Inactiva" in names


def test_list_all_cities_with_active_event_counts_counts_future_approved_events(
    session, city, organizer, location
):
    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title="Evento futuro",
        date=date(2999, 1, 1),
        time=time(21, 0),
        time_end=time(23, 0),
        status=EventStatus.approved,
        is_active=True,
    )
    session.add(event)
    session.commit()

    result = list_all_cities_with_active_event_counts(session)
    count = next(c for _city, c in result if _city.id == city.id)

    assert count == 1


# Etapa 8a — update_city_sort_order


def test_update_city_sort_order_updates_value(session, city):
    updated = update_city_sort_order(session, city.id, 5)

    assert updated.sort_order == 5


def test_update_city_sort_order_nonexistent_raises_lookup_error(session):
    with pytest.raises(LookupError):
        update_city_sort_order(session, uuid4(), 1)
