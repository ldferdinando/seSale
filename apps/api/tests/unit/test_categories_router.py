from datetime import timedelta

from httpx import AsyncClient
from sqlmodel import Session, select

from app.core.timezone import argentina_today
from app.models import City, Event, EventCategory, EventStatus, Location, User
from app.models.event_category_catalog import EventCategoryCatalog


def _make_event(
    session: Session,
    *,
    city: City,
    organizer: User,
    location: Location,
    category: str = "musica",
    **kwargs,
) -> Event:
    from datetime import time

    defaults = dict(
        title="Evento de prueba",
        date=argentina_today() + timedelta(days=7),
        time=time(21, 0),
        time_end=time(23, 0),
        status=EventStatus.approved,
        is_active=True,
    )
    defaults.update(kwargs)
    event = Event(city_id=city.id, organizer_id=organizer.id, location_id=location.id, **defaults)
    session.add(event)
    session.commit()
    session.refresh(event)
    session.add(EventCategory(event_id=event.id, category=category))
    session.commit()
    return event


async def test_get_categories_returns_only_active_ordered_by_sort_order(
    client: AsyncClient, session: Session
):
    inactive = session.exec(
        select(EventCategoryCatalog).where(EventCategoryCatalog.key == "deportes")
    ).one()
    inactive.is_active = False
    session.add(inactive)
    session.commit()

    response = await client.get("/api/categories")

    assert response.status_code == 200
    body = response.json()
    keys = [c["key"] for c in body]
    assert "deportes" not in keys
    sort_orders = [c["sort_order"] for c in body]
    assert sort_orders == sorted(sort_orders)
    assert body[0]["key"] == "musica"
    assert "is_active" not in body[0]


async def test_get_categories_no_auth_required(client: AsyncClient):
    response = await client.get("/api/categories")

    assert response.status_code == 200


# ── GET /api/categories/counts (Etapa 13a) ──────────────────────────────


async def test_category_counts_requires_city_id(client: AsyncClient):
    response = await client.get("/api/categories/counts")

    assert response.status_code == 422


async def test_category_counts_has_entry_per_active_category_all_zero(
    client: AsyncClient, session: Session, city: City
):
    response = await client.get("/api/categories/counts", params={"city_id": str(city.id)})

    assert response.status_code == 200
    body = response.json()
    active_keys = {
        c.key
        for c in session.exec(
            select(EventCategoryCatalog).where(EventCategoryCatalog.is_active == True)  # noqa: E712
        )
    }
    assert set(body) == active_keys
    assert all(count == 0 for count in body.values())


async def test_category_counts_counts_future_approved_active_events(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location
):
    _make_event(session, city=city, organizer=organizer, location=location, category="musica")
    _make_event(session, city=city, organizer=organizer, location=location, category="musica")
    _make_event(session, city=city, organizer=organizer, location=location, category="teatro")

    response = await client.get("/api/categories/counts", params={"city_id": str(city.id)})

    body = response.json()
    assert body["musica"] == 2
    assert body["teatro"] == 1
    assert body["feria"] == 0


async def test_category_counts_excludes_non_matching_events(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location
):
    other_city = City(name="Cipolletti", province="Río Negro", is_active=True)
    session.add(other_city)
    session.commit()
    session.refresh(other_city)
    other_location = Location(name="Otro lugar", address="Calle 1", city_id=other_city.id)
    session.add(other_location)
    session.commit()
    session.refresh(other_location)

    _make_event(
        session, city=city, organizer=organizer, location=location,
        category="musica", status=EventStatus.pending,
    )
    _make_event(
        session, city=city, organizer=organizer, location=location,
        category="musica", is_active=False,
    )
    _make_event(
        session, city=city, organizer=organizer, location=location,
        category="musica", date=argentina_today() - timedelta(days=2),
    )
    _make_event(
        session, city=other_city, organizer=organizer, location=other_location,
        category="musica",
    )

    response = await client.get("/api/categories/counts", params={"city_id": str(city.id)})

    assert response.json()["musica"] == 0


async def test_category_counts_no_auth_required(client: AsyncClient, city: City):
    response = await client.get("/api/categories/counts", params={"city_id": str(city.id)})

    assert response.status_code == 200
