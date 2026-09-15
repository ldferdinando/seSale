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
        time_end=time(23, 0),
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


def _make_location_report(session: Session, *, location: Location, status: str = "pending") -> Report:
    report = Report(
        location_id=location.id, text="Descripción del problema reportado", contact_phone="2984123456", status=status
    )
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
    assert body[0]["target_title"] == "Show reportado"
    assert body[0]["target_type"] == "event"
    assert body[0]["status"] == "pending"


async def test_get_admin_reports_includes_location_reports(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, admin_token_headers: dict[str, str]
):
    """Los reportes de lugar (location_id) también aparecen en el listado
    admin, junto con los de evento, respetando el orden por created_at desc."""
    event = _make_event(session, city=city, organizer=organizer, location=location)
    _make_report(session, event=event)
    _make_location_report(session, location=location)

    response = await client.get("/api/admin/reports", headers=admin_token_headers)

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    target_types = {row["target_type"] for row in body}
    assert target_types == {"event", "location"}

    location_row = next(row for row in body if row["target_type"] == "location")
    assert location_row["target_title"] == "El Tinglado Bar"
    assert location_row["event_id"] is None
    assert location_row["location_id"] == str(location.id)

    event_row = next(row for row in body if row["target_type"] == "event")
    assert event_row["target_title"] == "Show reportado"
    assert event_row["location_id"] is None
    assert event_row["event_id"] == str(event.id)


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


async def test_patch_admin_report_status_updates_location_report(
    client: AsyncClient, session: Session, location: Location, admin_token_headers: dict[str, str]
):
    report = _make_location_report(session, location=location)

    response = await client.patch(
        f"/api/admin/reports/{report.id}/status", json={"status": "reviewed"}, headers=admin_token_headers
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "reviewed"
    assert body["target_type"] == "location"
    assert body["target_title"] == "El Tinglado Bar"
