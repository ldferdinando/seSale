from datetime import date, time, timedelta

from httpx import AsyncClient
from sqlmodel import Session

from app.models import City, Event, EventCategory, EventStatus, Location, Report, User


def _make_event(session: Session, *, city: City, organizer: User, location: Location) -> Event:
    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title="Show reportado",
        date=date.today() + timedelta(days=5),
        time=time(21, 0),
        status=EventStatus.approved,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    session.add(EventCategory(event_id=event.id, category="musica"))
    session.commit()
    return event


def _make_report(session: Session, *, event: Event, status: str = "pending") -> Report:
    report = Report(event_id=event.id, text="Descripción del problema reportado", contact_phone="2984123456", status=status)
    session.add(report)
    session.commit()
    session.refresh(report)
    return report


async def test_get_admin_reports_without_token_returns_401(client: AsyncClient):
    response = await client.get("/api/admin/reports")

    assert response.status_code == 401


async def test_get_admin_reports_as_user_returns_403(client: AsyncClient, user_token_headers: dict[str, str]):
    response = await client.get("/api/admin/reports", headers=user_token_headers)

    assert response.status_code == 403


async def test_get_admin_reports_as_admin_returns_reports(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, admin_token_headers: dict[str, str]
):
    event = _make_event(session, city=city, organizer=organizer, location=location)
    _make_report(session, event=event)

    response = await client.get("/api/admin/reports", headers=admin_token_headers)

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["event_title"] == "Show reportado"
    assert body[0]["status"] == "pending"


async def test_patch_admin_report_status_updates(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, admin_token_headers: dict[str, str]
):
    event = _make_event(session, city=city, organizer=organizer, location=location)
    report = _make_report(session, event=event)

    response = await client.patch(
        f"/api/admin/reports/{report.id}/status", json={"status": "reviewed"}, headers=admin_token_headers
    )

    assert response.status_code == 200
    assert response.json()["status"] == "reviewed"
