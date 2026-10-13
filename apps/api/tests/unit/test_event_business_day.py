"""Corrección de producción (ver a_revisar.md):

- Parte 1: un evento nocturno (sáb 17/10 22:00–23:55 ART) tiene que
  clasificarse como sábado en todos los filtros. `Event.date`/`date_end`
  son días de negocio ART; `time`/`time_end` horas UTC.
- Criterio de eventos que cruzan medianoche: pertenecen al día de INICIO.
- Parte 2: `time_end` opcional.
- Parte 4: borrado lógico real con `deleted_at`.
"""

from datetime import date, datetime, time, timedelta, timezone

import pytest
from sqlmodel import Session, select

from app.core.timezone import ARGENTINA_DAY_START_UTC, ARGENTINA_TZ, event_end_datetime, event_local_datetime
from app.models import City, Event, EventCategory, EventMoment, EventStatus, Location, User
from app.schemas.event import EventCreate, EventUpdate
from app.services.event_service import (
    create_event,
    delete_event,
    delete_event_flyer,
    get_event_detail,
    get_events_for_organizer,
    is_event_currently_visible,
    list_admin_events,
    list_public_events,
    update_event,
)

SATURDAY = date(2026, 10, 17)
SUNDAY = date(2026, 10, 18)


def _art(day: date, hour: int, minute: int = 0) -> datetime:
    return datetime.combine(day, time(hour, minute), tzinfo=ARGENTINA_TZ)


def _make_event(
    session: Session,
    *,
    city: City,
    organizer: User,
    location: Location,
    title: str,
    event_date: date = SATURDAY,
    event_time: time = time(1, 0),  # 22:00 ART
    event_date_end: date | None = SATURDAY,
    event_time_end: time | None = time(2, 55),  # 23:55 ART
    status: EventStatus = EventStatus.approved,
) -> Event:
    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title=title,
        date=event_date,
        time=event_time,
        date_end=event_date_end,
        time_end=event_time_end,
        status=status,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    session.add(EventCategory(event_id=event.id, category="musica"))
    session.commit()
    session.refresh(event)
    return event


# --- helpers de core/timezone.py -------------------------------------------


def test_argentina_day_start_utc_is_three_am():
    assert ARGENTINA_DAY_START_UTC == time(3, 0)


def test_event_local_datetime_keeps_business_day_for_night_hours():
    # 01:00 UTC "del sábado" (día de negocio) = sábado 22:00 ART, no viernes.
    assert event_local_datetime(SATURDAY, time(1, 0)) == _art(SATURDAY, 22)


def test_event_end_datetime_without_time_end_is_end_of_business_day():
    assert event_end_datetime(SATURDAY, None, None) == _art(SUNDAY, 0)
    assert event_end_datetime(SATURDAY, SUNDAY, None) == _art(SUNDAY + timedelta(days=1), 0)


# --- Parte 1: evento sábado 22:00–23:55 (no cruza medianoche) ---------------


def test_night_event_is_listed_on_saturday_chip_not_sunday(session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="noche")
    now = _art(SATURDAY, 10)

    saturday = list_public_events(session, date_from=SATURDAY, date_to=SATURDAY, now=now)
    sunday = list_public_events(session, date_from=SUNDAY, date_to=SUNDAY, now=now)

    assert [e.title for e in saturday] == ["noche"]
    assert sunday == []


def test_night_event_visible_until_it_ends_on_saturday(session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="noche")

    assert [e.title for e in list_public_events(session, now=_art(SATURDAY, 23, 50))] == ["noche"]
    assert list_public_events(session, now=_art(SATURDAY, 23, 56)) == []


def test_is_event_currently_visible_night_event_does_not_end_a_day_early():
    """Antes: combine(17/10, 02:55, UTC) = viernes 16/10 23:55 ART — el
    evento desaparecía del listado un día antes de ocurrir."""
    assert is_event_currently_visible(SATURDAY, SATURDAY, time(2, 55), _art(SATURDAY, 12)) is True


def test_night_event_is_classified_as_nocturno(session, city, organizer):
    event = create_event(
        session,
        user_id=organizer.id,
        title="noche",
        description=None,
        event_date=SATURDAY,
        event_time=time(1, 0),
        time_end=time(2, 55),
        date_end=SATURDAY,
        categories=["musica"],
        location_text="Calle 123",
    )
    moments = session.exec(select(EventMoment.moment).where(EventMoment.event_id == event.id)).all()
    assert moments == ["nocturno"]
    assert event.date == SATURDAY


def test_public_list_orders_by_local_time_within_the_day(session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="22hs")
    _make_event(
        session,
        city=city,
        organizer=organizer,
        location=location,
        title="20hs",
        event_time=time(23, 0),  # 20:00 ART
        event_time_end=time(2, 0),  # 23:00 ART, mismo día
    )

    result = list_public_events(session, now=_art(SATURDAY, 10))

    assert [e.title for e in result] == ["20hs", "22hs"]


def test_organizer_approved_list_orders_by_local_time(session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="22hs")
    _make_event(
        session,
        city=city,
        organizer=organizer,
        location=location,
        title="20hs",
        event_time=time(23, 0),
        event_time_end=time(2, 0),
    )

    grouped = get_events_for_organizer(session, organizer.id)

    assert [e.title for e in grouped[EventStatus.approved]] == ["20hs", "22hs"]


# --- Criterio: eventos que cruzan medianoche -> día de inicio --------------


def test_crossmidnight_event_belongs_to_start_day_chip(session, city, organizer, location):
    # Sábado 23:00 ART -> domingo 02:00 ART.
    _make_event(
        session,
        city=city,
        organizer=organizer,
        location=location,
        title="trasnoche",
        event_time=time(2, 0),
        event_date_end=SUNDAY,
        event_time_end=time(5, 0),
    )
    now = _art(SATURDAY, 10)

    assert [e.title for e in list_public_events(session, date_from=SATURDAY, date_to=SATURDAY, now=now)] == [
        "trasnoche"
    ]
    assert list_public_events(session, date_from=SUNDAY, date_to=SUNDAY, now=now) == []


def test_crossmidnight_event_still_listed_without_date_filter_while_ongoing(session, city, organizer, location):
    _make_event(
        session,
        city=city,
        organizer=organizer,
        location=location,
        title="trasnoche",
        event_time=time(2, 0),
        event_date_end=SUNDAY,
        event_time_end=time(5, 0),
    )

    assert [e.title for e in list_public_events(session, now=_art(SUNDAY, 1, 30))] == ["trasnoche"]
    assert list_public_events(session, now=_art(SUNDAY, 2, 1)) == []


# --- Validación de schemas con el par (día ART, hora UTC) ------------------


def _create_payload(**overrides) -> dict:
    payload = {
        "title": "Evento",
        "date": (date.today() + timedelta(days=10)).isoformat(),
        "time": "23:00:00",
        "time_end": "01:00:00",
        "categories": ["musica"],
        "location_text": "Calle 123",
    }
    payload.update(overrides)
    return payload


def test_event_create_accepts_night_span_on_same_business_day():
    # 20:00 -> 22:00 ART, mismo día.
    EventCreate.model_validate(_create_payload())


def test_event_create_rejects_end_before_start_in_local_time():
    # 22:00 -> 20:00 ART del mismo día.
    with pytest.raises(ValueError):
        EventCreate.model_validate(_create_payload(time="01:00:00", time_end="23:00:00"))


def test_event_create_without_time_end_defaults_date_end():
    payload = _create_payload()
    del payload["time_end"]
    created = EventCreate.model_validate(payload)
    assert created.time_end is None
    assert created.date_end == created.date


def test_event_create_without_time_end_rejects_date_end_before_date():
    payload = _create_payload()
    del payload["time_end"]
    payload["date_end"] = (date.today() + timedelta(days=9)).isoformat()
    with pytest.raises(ValueError):
        EventCreate.model_validate(payload)


def test_event_update_accepts_explicit_null_time_end():
    update = EventUpdate.model_validate({"time": "23:00:00", "time_end": None})
    assert update.time_end is None
    assert "time_end" in update.model_fields_set


# --- Parte 2: time_end opcional ---------------------------------------------


def test_event_without_time_end_is_visible_until_end_of_its_day(session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="sin-fin", event_time_end=None)

    assert [e.title for e in list_public_events(session, now=_art(SATURDAY, 23, 59))] == ["sin-fin"]
    assert list_public_events(session, now=_art(SUNDAY, 0, 1)) == []


def test_create_event_without_time_end_computes_moment_from_start(session, city, organizer):
    event = create_event(
        session,
        user_id=organizer.id,
        title="sin-fin",
        description=None,
        event_date=SATURDAY,
        event_time=time(1, 0),
        categories=["musica"],
        location_text="Calle 123",
    )
    moments = session.exec(select(EventMoment.moment).where(EventMoment.event_id == event.id)).all()
    assert event.time_end is None
    assert moments == ["nocturno"]


def test_update_event_can_clear_time_end(session, city, organizer, location, admin):
    event = _make_event(session, city=city, organizer=organizer, location=location, title="e")

    updated = update_event(session, event.id, admin, EventUpdate(time=time(1, 0), time_end=None))

    assert updated.time_end is None


# --- Parte 4: borrado lógico -----------------------------------------------


def test_delete_event_sets_deleted_at_and_inactive(session, city, organizer, location):
    event = _make_event(session, city=city, organizer=organizer, location=location, title="e")

    deleted = delete_event(session, event.id, organizer)

    assert deleted.deleted_at is not None
    assert deleted.is_active is False


def test_delete_event_twice_raises_lookup_error(session, city, organizer, location, admin):
    event = _make_event(session, city=city, organizer=organizer, location=location, title="e")
    delete_event(session, event.id, admin)

    with pytest.raises(LookupError):
        delete_event(session, event.id, admin)


def test_deleted_event_excluded_from_admin_list_by_default(session, city, organizer, location, admin):
    event = _make_event(session, city=city, organizer=organizer, location=location, title="borrado")
    _make_event(session, city=city, organizer=organizer, location=location, title="vivo")
    delete_event(session, event.id, admin)

    assert [e.title for e in list_admin_events(session)] == ["vivo"]
    assert {e.title for e in list_admin_events(session, include_deleted=True)} == {"borrado", "vivo"}


def test_deleted_event_excluded_from_organizer_list(session, city, organizer, location):
    event = _make_event(session, city=city, organizer=organizer, location=location, title="borrado")
    delete_event(session, event.id, organizer)

    grouped = get_events_for_organizer(session, organizer.id)

    assert all(not events for events in grouped.values())


def test_deleted_event_detail_hidden_for_owner_but_not_admin(session, city, organizer, location, admin):
    event = _make_event(session, city=city, organizer=organizer, location=location, title="borrado")
    delete_event(session, event.id, organizer)

    with pytest.raises(LookupError):
        get_event_detail(session, event.id, organizer)
    assert get_event_detail(session, event.id, admin).id == event.id


def test_deleted_event_cannot_be_edited_or_reactivated(session, city, organizer, location):
    event = _make_event(session, city=city, organizer=organizer, location=location, title="borrado")
    delete_event(session, event.id, organizer)

    with pytest.raises(LookupError):
        update_event(session, event.id, organizer, EventUpdate(is_active=True))
    with pytest.raises(LookupError):
        delete_event_flyer(session, event.id, organizer)


def test_inactive_but_not_deleted_event_still_listed_for_admin(session, city, organizer, location, admin):
    """"Dar de baja" (is_active=False, sin deleted_at) sigue apareciendo en el
    panel admin — solo el borrado lógico lo saca."""
    event = _make_event(session, city=city, organizer=organizer, location=location, title="pausado")
    update_event(session, event.id, organizer, EventUpdate(is_active=False))

    assert [e.title for e in list_admin_events(session)] == ["pausado"]


def test_deleted_at_is_utc_aware_now(session, city, organizer, location):
    event = _make_event(session, city=city, organizer=organizer, location=location, title="e")
    before = datetime.now(timezone.utc)

    deleted = delete_event(session, event.id, organizer)

    deleted_at = deleted.deleted_at
    if deleted_at.tzinfo is None:  # SQLite devuelve naive
        deleted_at = deleted_at.replace(tzinfo=timezone.utc)
    assert deleted_at >= before - timedelta(seconds=1)
