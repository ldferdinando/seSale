from datetime import date, time, timedelta

from httpx import AsyncClient
from sqlmodel import Session

from app.models import City, Event, EventCategory, EventStatus, Location, User


def _make_event(
    session: Session, *, city: City, organizer: User, location: Location, status: EventStatus = EventStatus.approved
) -> Event:
    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title="Show en el bar",
        date=date.today() + timedelta(days=5),
        time=time(21, 0),
        time_end=time(23, 0),
        status=status,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    session.add(EventCategory(event_id=event.id, category="musica"))
    session.commit()
    return event


async def test_report_event_success(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, monkeypatch
):
    sent_emails = []

    async def fake_send(**kwargs):
        sent_emails.append(kwargs)

    monkeypatch.setattr("app.routers.reports.send_report_email", fake_send)

    event = _make_event(session, city=city, organizer=organizer, location=location)

    response = await client.post(
        f"/api/events/{event.id}/report",
        json={"text": "Este evento tiene información incorrecta", "contact_phone": "2984123456"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["event_id"] == str(event.id)
    assert body["status"] == "pending"
    assert len(sent_emails) == 1
    assert sent_emails[0]["event_title"] == "Show en el bar"


async def test_report_event_not_approved_returns_404(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location
):
    event = _make_event(session, city=city, organizer=organizer, location=location, status=EventStatus.pending)

    response = await client.post(
        f"/api/events/{event.id}/report",
        json={"text": "Este evento tiene información incorrecta", "contact_phone": "2984123456"},
    )

    assert response.status_code == 404


async def test_report_event_short_text_returns_422(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location
):
    event = _make_event(session, city=city, organizer=organizer, location=location)

    response = await client.post(
        f"/api/events/{event.id}/report",
        json={"text": "corto", "contact_phone": "2984123456"},
    )

    assert response.status_code == 422


async def test_report_event_missing_phone_returns_422(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location
):
    event = _make_event(session, city=city, organizer=organizer, location=location)

    response = await client.post(
        f"/api/events/{event.id}/report",
        json={"text": "Este evento tiene información incorrecta", "contact_phone": ""},
    )

    assert response.status_code == 422


async def test_report_event_rate_limited_after_three_per_hour(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, monkeypatch
):
    async def fake_send(**kwargs):
        return None

    monkeypatch.setattr("app.routers.reports.send_report_email", fake_send)

    event = _make_event(session, city=city, organizer=organizer, location=location)
    payload = {"text": "Este evento tiene información incorrecta", "contact_phone": "2984123456"}

    for _ in range(3):
        response = await client.post(f"/api/events/{event.id}/report", json=payload)
        assert response.status_code == 201

    fourth = await client.post(f"/api/events/{event.id}/report", json=payload)
    assert fourth.status_code == 429
