from datetime import date, datetime, time, timedelta, timezone

from httpx import AsyncClient
from sqlmodel import Session, select

from app.models import City, Event, EventStatus, Location, LocationGastroType, User

GASTRO_PAYLOAD = {
    "name": "El Tinglado Bar",
    "address": "Av. Roca 1240",
    "gastro_types": ["bar", "cerveceria"],
}


def _make_gastro_location(session: Session, *, city: City, **overrides) -> Location:
    defaults = dict(
        name="El Tinglado Bar",
        address="Av. Roca 1240",
        city_id=city.id,
        is_gastro=True,
        is_active=True,
        is_public=True,
        plan="gratis",
    )
    defaults.update(overrides)
    types = defaults.pop("gastro_types", ["bar"])
    location = Location(**defaults)
    session.add(location)
    session.commit()
    session.refresh(location)
    for t in types:
        session.add(LocationGastroType(location_id=location.id, gastro_type=t))
    session.commit()
    return location


# ── GET /api/gastro (público) ────────────────────────────────────────────


async def test_get_gastro_requires_city_id(client: AsyncClient):
    response = await client.get("/api/gastro")

    assert response.status_code == 422


async def test_get_gastro_only_returns_gastro_active_public(
    client: AsyncClient, session: Session, city: City
):
    visible = _make_gastro_location(session, city=city, name="Visible")
    _make_gastro_location(session, city=city, name="Inactivo", is_active=False)
    _make_gastro_location(session, city=city, name="NoPublico", is_public=False)
    not_gastro = Location(name="Solo eventos", address="X 1", city_id=city.id, is_gastro=False)
    session.add(not_gastro)
    session.commit()

    response = await client.get("/api/gastro", params={"city_id": str(city.id)})

    assert response.status_code == 200
    names = {p["name"] for p in response.json()}
    assert names == {"Visible"}
    assert names.issubset({"Visible"})
    assert visible.name in names


async def test_get_gastro_filters_by_type_or(client: AsyncClient, session: Session, city: City):
    _make_gastro_location(session, city=city, name="Solo bar", gastro_types=["bar"])
    _make_gastro_location(session, city=city, name="Bar y cerveceria", gastro_types=["bar", "cerveceria"])
    _make_gastro_location(session, city=city, name="Solo cafe", gastro_types=["cafe"])

    response = await client.get("/api/gastro", params={"city_id": str(city.id), "gastro_type": "bar"})

    names = {p["name"] for p in response.json()}
    assert names == {"Solo bar", "Bar y cerveceria"}


async def test_get_gastro_order_pro_dest_gratis_then_name(
    client: AsyncClient, session: Session, city: City
):
    _make_gastro_location(session, city=city, name="Z gratis", plan="gratis")
    _make_gastro_location(session, city=city, name="A gratis", plan="gratis")
    _make_gastro_location(session, city=city, name="Z dest", plan="dest")
    _make_gastro_location(session, city=city, name="Z pro", plan="pro")

    response = await client.get("/api/gastro", params={"city_id": str(city.id)})

    names = [p["name"] for p in response.json()]
    assert names == ["Z pro", "Z dest", "A gratis", "Z gratis"]


async def test_get_gastro_place_detail_not_gastro_returns_404(
    client: AsyncClient, session: Session, city: City
):
    location = Location(name="Solo eventos", address="X 1", city_id=city.id, is_gastro=False)
    session.add(location)
    session.commit()
    session.refresh(location)

    response = await client.get(f"/api/gastro/{location.id}")

    assert response.status_code == 404


async def test_get_gastro_place_detail_inactive_returns_404(
    client: AsyncClient, session: Session, city: City
):
    location = _make_gastro_location(session, city=city, is_active=False)

    response = await client.get(f"/api/gastro/{location.id}")

    assert response.status_code == 404


async def test_get_gastro_place_detail_includes_future_approved_event_count(
    client: AsyncClient, session: Session, city: City, organizer: User
):
    location = _make_gastro_location(session, city=city)
    session.add(
        Event(
            city_id=city.id,
            organizer_id=organizer.id,
            location_id=location.id,
            title="Show en el bar",
            date=date.today() + timedelta(days=5),
            time=time(21, 0),
            status=EventStatus.approved,
        )
    )
    session.commit()

    response = await client.get(f"/api/gastro/{location.id}")

    assert response.status_code == 200
    assert response.json()["event_count"] == 1


# ── POST/PUT /api/admin/gastro ───────────────────────────────────────────


async def test_post_admin_gastro_forces_is_gastro_and_plan_gratis(
    client: AsyncClient, city: City, admin_token_headers: dict[str, str]
):
    payload = {**GASTRO_PAYLOAD, "city_id": str(city.id)}

    response = await client.post("/api/admin/gastro", json=payload, headers=admin_token_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["is_gastro"] is True
    assert body["plan"] == "gratis"
    assert set(body["gastro_types"]) == {"bar", "cerveceria"}


async def test_post_admin_gastro_requires_admin(
    client: AsyncClient, city: City, user_token_headers: dict[str, str]
):
    payload = {**GASTRO_PAYLOAD, "city_id": str(city.id)}

    response = await client.post("/api/admin/gastro", json=payload, headers=user_token_headers)

    assert response.status_code == 403


async def test_post_admin_gastro_invalid_type_returns_422(
    client: AsyncClient, city: City, admin_token_headers: dict[str, str]
):
    payload = {**GASTRO_PAYLOAD, "city_id": str(city.id), "gastro_types": ["sushi"]}

    response = await client.post("/api/admin/gastro", json=payload, headers=admin_token_headers)

    assert response.status_code == 422


async def test_post_admin_gastro_zero_types_returns_422(
    client: AsyncClient, city: City, admin_token_headers: dict[str, str]
):
    payload = {**GASTRO_PAYLOAD, "city_id": str(city.id), "gastro_types": []}

    response = await client.post("/api/admin/gastro", json=payload, headers=admin_token_headers)

    assert response.status_code == 422


async def test_post_admin_gastro_six_types_returns_422(
    client: AsyncClient, city: City, admin_token_headers: dict[str, str]
):
    payload = {
        **GASTRO_PAYLOAD,
        "city_id": str(city.id),
        "gastro_types": ["bar", "cafe", "pizzeria", "parrilla", "vinoteca", "otro"],
    }

    response = await client.post("/api/admin/gastro", json=payload, headers=admin_token_headers)

    assert response.status_code == 422


async def test_put_admin_gastro_replaces_gastro_types(
    client: AsyncClient, session: Session, city: City, admin_token_headers: dict[str, str]
):
    location = _make_gastro_location(session, city=city, gastro_types=["bar", "cerveceria"])

    response = await client.put(
        f"/api/admin/gastro/{location.id}",
        json={"gastro_types": ["cafe"]},
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["gastro_types"] == ["cafe"]
    remaining_types = {
        t.gastro_type
        for t in session.exec(
            select(LocationGastroType).where(LocationGastroType.location_id == location.id)
        ).all()
    }
    assert remaining_types == {"cafe"}


async def test_put_admin_gastro_unknown_id_returns_404(
    client: AsyncClient, admin_token_headers: dict[str, str]
):
    response = await client.put(
        "/api/admin/gastro/00000000-0000-0000-0000-000000000000",
        json={"description": "x"},
        headers=admin_token_headers,
    )

    assert response.status_code == 404


# ── DELETE /api/admin/gastro/{id} ────────────────────────────────────────


async def test_delete_admin_gastro_with_future_events_returns_409(
    client: AsyncClient, session: Session, city: City, organizer: User, admin_token_headers: dict[str, str]
):
    location = _make_gastro_location(session, city=city)
    session.add(
        Event(
            city_id=city.id,
            organizer_id=organizer.id,
            location_id=location.id,
            title="Evento futuro",
            date=date.today() + timedelta(days=3),
            time=time(21, 0),
            status=EventStatus.approved,
        )
    )
    session.commit()

    response = await client.delete(f"/api/admin/gastro/{location.id}", headers=admin_token_headers)

    assert response.status_code == 409
    assert "evento" in response.json()["detail"].lower()


async def test_delete_admin_gastro_without_future_events_succeeds(
    client: AsyncClient, session: Session, city: City, admin_token_headers: dict[str, str]
):
    location = _make_gastro_location(session, city=city)

    response = await client.delete(f"/api/admin/gastro/{location.id}", headers=admin_token_headers)

    assert response.status_code == 200
    assert session.get(Location, location.id) is None


# ── PATCH plan ────────────────────────────────────────────────────────────


async def test_patch_admin_gastro_plan_dest_sets_featured_until_30_days(
    client: AsyncClient, session: Session, city: City, admin_token_headers: dict[str, str]
):
    location = _make_gastro_location(session, city=city)

    response = await client.patch(
        f"/api/admin/gastro/{location.id}/plan", json={"plan": "dest"}, headers=admin_token_headers
    )

    assert response.status_code == 200
    body = response.json()
    assert body["plan"] == "dest"
    featured_until = datetime.fromisoformat(body["featured_until"])
    if featured_until.tzinfo is None:
        featured_until = featured_until.replace(tzinfo=timezone.utc)
    delta = featured_until - datetime.now(timezone.utc)
    assert timedelta(days=29) < delta < timedelta(days=31)


async def test_patch_admin_gastro_plan_gratis_clears_featured_until(
    client: AsyncClient, session: Session, city: City, admin_token_headers: dict[str, str]
):
    location = _make_gastro_location(
        session, city=city, plan="pro", featured_until=datetime.now(timezone.utc) + timedelta(days=10)
    )

    response = await client.patch(
        f"/api/admin/gastro/{location.id}/plan", json={"plan": "gratis"}, headers=admin_token_headers
    )

    assert response.status_code == 200
    body = response.json()
    assert body["plan"] == "gratis"
    assert body["featured_until"] is None


# ── PATCH verify ──────────────────────────────────────────────────────────


async def test_patch_admin_gastro_verify_toggles(
    client: AsyncClient, session: Session, city: City, admin_token_headers: dict[str, str]
):
    location = _make_gastro_location(session, city=city, is_verified=False)

    response = await client.patch(
        f"/api/admin/gastro/{location.id}/verify",
        json={"is_verified": True},
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["is_verified"] is True


# ── Cover upload ──────────────────────────────────────────────────────────


async def test_post_admin_gastro_cover_valid_file_updates_url(
    client: AsyncClient, session: Session, city: City, admin_token_headers: dict[str, str]
):
    location = _make_gastro_location(session, city=city)

    response = await client.post(
        f"/api/admin/gastro/{location.id}/cover",
        files={"file": ("cover.jpg", b"\xff\xd8\xff" + b"0" * 100, "image/jpeg")},
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["cover_img_url"] is not None
    session.refresh(location)
    assert location.cover_img_url is not None


async def test_post_admin_gastro_cover_too_large_returns_422(
    client: AsyncClient, session: Session, city: City, admin_token_headers: dict[str, str]
):
    location = _make_gastro_location(session, city=city)
    big_content = b"0" * (5 * 1024 * 1024 + 1)

    response = await client.post(
        f"/api/admin/gastro/{location.id}/cover",
        files={"file": ("cover.jpg", big_content, "image/jpeg")},
        headers=admin_token_headers,
    )

    assert response.status_code == 422


# ── GET /api/admin/gastro ────────────────────────────────────────────────


async def test_get_admin_gastro_requires_admin(client: AsyncClient, user_token_headers: dict[str, str]):
    response = await client.get("/api/admin/gastro", headers=user_token_headers)

    assert response.status_code == 403


async def test_get_admin_gastro_includes_inactive_and_private(
    client: AsyncClient, session: Session, city: City, admin_token_headers: dict[str, str]
):
    _make_gastro_location(session, city=city, name="Activo", is_active=True)
    _make_gastro_location(session, city=city, name="Inactivo", is_active=False)

    response = await client.get("/api/admin/gastro", headers=admin_token_headers)

    assert response.status_code == 200
    names = {p["name"] for p in response.json()}
    assert names == {"Activo", "Inactivo"}
