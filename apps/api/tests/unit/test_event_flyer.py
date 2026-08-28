"""Etapa 8b/12b — POST/DELETE /api/events/{id}/flyer/{desktop|mobile}.

Etapa 12b — flyer dual: dos tamaños independientes (`flyer_url_desktop` y
`flyer_url_mobile`). Reglas de permiso:
- Organizador dueño: solo con plan Destacado Plus (`pro`).
- Admin: siempre, sin importar el plan del evento.
- Cualquier otro: 403.
"""

import uuid
from datetime import date, time
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlmodel import Session

from app.core.security import create_access_token, hash_password
from app.models import City, Event, EventCategory, EventStatus, Location, PlanType, User

TINY_PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753"
    "de0000000c4944415478da6360000002000155a24d770000000049454e44ae426082"
)


def _make_event(session: Session, *, city: City, organizer: User, location: Location, **kwargs) -> Event:
    defaults = dict(
        title="Show con flyer",
        date=date(2026, 6, 1),
        time=time(21, 0),
        time_end=time(23, 0),
        status=EventStatus.approved,
        is_active=True,
        plan=PlanType.pro,
    )
    defaults.update(kwargs)
    event = Event(city_id=city.id, organizer_id=organizer.id, location_id=location.id, **defaults)
    session.add(event)
    session.commit()
    session.refresh(event)
    session.add(EventCategory(event_id=event.id, category="musica"))
    session.commit()
    return event


def _png_file(name: str = "flyer.png"):
    return {"file": (name, TINY_PNG, "image/png")}


@pytest.mark.parametrize("size", ["desktop", "mobile"])
async def test_upload_flyer_with_plan_pro_succeeds_and_updates_url(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, user_token_headers, tmp_path, size
):
    event = _make_event(session, city=city, organizer=organizer, location=location, plan=PlanType.pro)

    with patch("app.core.storage._UPLOADS_DIR", tmp_path):
        response = await client.post(
            f"/api/events/{event.id}/flyer/{size}", files=_png_file(), headers=user_token_headers
        )

    assert response.status_code == 200
    body = response.json()
    field = f"flyer_url_{size}"
    other_field = "flyer_url_mobile" if size == "desktop" else "flyer_url_desktop"
    assert body[field]
    assert f"/{size}/" in body[field]
    assert body[other_field] is None

    session.refresh(event)
    assert getattr(event, field) == body[field]
    assert getattr(event, other_field) is None


async def test_upload_flyer_desktop_with_plan_gratis_by_organizer_returns_400(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, user_token_headers
):
    event = _make_event(session, city=city, organizer=organizer, location=location, plan=PlanType.gratis)

    response = await client.post(
        f"/api/events/{event.id}/flyer/desktop", files=_png_file(), headers=user_token_headers
    )

    assert response.status_code == 400
    assert "Gratuito" in response.json()["detail"]


async def test_upload_flyer_desktop_with_plan_dest_by_organizer_returns_400(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, user_token_headers
):
    event = _make_event(session, city=city, organizer=organizer, location=location, plan=PlanType.dest)

    response = await client.post(
        f"/api/events/{event.id}/flyer/mobile", files=_png_file(), headers=user_token_headers
    )

    assert response.status_code == 400
    assert "Destacado" in response.json()["detail"]


@pytest.mark.parametrize("plan", [PlanType.gratis, PlanType.dest, PlanType.pro])
async def test_upload_flyer_by_admin_succeeds_with_any_plan(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, admin_token_headers, tmp_path, plan
):
    event = _make_event(session, city=city, organizer=organizer, location=location, plan=plan)

    with patch("app.core.storage._UPLOADS_DIR", tmp_path):
        response = await client.post(
            f"/api/events/{event.id}/flyer/desktop", files=_png_file(), headers=admin_token_headers
        )

    assert response.status_code == 200
    assert response.json()["flyer_url_desktop"]


async def test_upload_flyer_invalid_format_returns_422(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, user_token_headers
):
    event = _make_event(session, city=city, organizer=organizer, location=location, plan=PlanType.pro)

    response = await client.post(
        f"/api/events/{event.id}/flyer/desktop",
        files={"file": ("flyer.pdf", b"%PDF-1.4 fake", "application/pdf")},
        headers=user_token_headers,
    )

    assert response.status_code == 422


async def test_upload_flyer_too_large_returns_422(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, user_token_headers
):
    event = _make_event(session, city=city, organizer=organizer, location=location, plan=PlanType.pro)
    too_big = b"0" * (5 * 1024 * 1024 + 1)

    response = await client.post(
        f"/api/events/{event.id}/flyer/desktop",
        files={"file": ("flyer.png", too_big, "image/png")},
        headers=user_token_headers,
    )

    assert response.status_code == 422


async def test_upload_flyer_by_non_organizer_returns_403(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location
):
    other = User(
        email="otro@sesale.com.ar",
        hashed_password=hash_password("Password123!"),
        full_name="Otro Usuario",
        public_name="Otro",
        city_id=city.id,
    )
    session.add(other)
    session.commit()
    session.refresh(other)
    other_token = {"Authorization": f"Bearer {create_access_token(other.id, other.role)}"}

    event = _make_event(session, city=city, organizer=organizer, location=location, plan=PlanType.pro)

    response = await client.post(
        f"/api/events/{event.id}/flyer/desktop", files=_png_file(), headers=other_token
    )

    assert response.status_code == 403


async def test_upload_flyer_event_not_found_returns_404(client: AsyncClient, user_token_headers):
    response = await client.post(
        f"/api/events/{uuid.uuid4()}/flyer/desktop", files=_png_file(), headers=user_token_headers
    )

    assert response.status_code == 404


async def test_upload_flyer_replaces_previous_file_of_same_size(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, user_token_headers, tmp_path
):
    event = _make_event(session, city=city, organizer=organizer, location=location, plan=PlanType.pro)

    with patch("app.core.storage._UPLOADS_DIR", tmp_path):
        first = await client.post(
            f"/api/events/{event.id}/flyer/desktop", files=_png_file("primero.png"), headers=user_token_headers
        )
        assert first.status_code == 200
        size_dir = tmp_path / str(event.id) / "desktop"
        assert len(list(size_dir.iterdir())) == 1

        second = await client.post(
            f"/api/events/{event.id}/flyer/desktop", files=_png_file("segundo.png"), headers=user_token_headers
        )
        assert second.status_code == 200
        assert len(list(size_dir.iterdir())) == 1


async def test_delete_flyer_mobile_clears_only_mobile(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, user_token_headers, tmp_path
):
    event = _make_event(session, city=city, organizer=organizer, location=location, plan=PlanType.pro)

    with patch("app.core.storage._UPLOADS_DIR", tmp_path):
        await client.post(
            f"/api/events/{event.id}/flyer/desktop", files=_png_file(), headers=user_token_headers
        )
        await client.post(
            f"/api/events/{event.id}/flyer/mobile", files=_png_file(), headers=user_token_headers
        )

        response = await client.delete(f"/api/events/{event.id}/flyer/mobile", headers=user_token_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["flyer_url_mobile"] is None
    assert body["flyer_url_desktop"]

    session.refresh(event)
    assert event.flyer_url_mobile is None
    assert event.flyer_url_desktop is not None


async def test_delete_flyer_by_non_organizer_returns_403(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location
):
    other = User(
        email="otro2@sesale.com.ar",
        hashed_password=hash_password("Password123!"),
        full_name="Otro Usuario",
        public_name="Otro",
        city_id=city.id,
    )
    session.add(other)
    session.commit()
    session.refresh(other)
    other_token = {"Authorization": f"Bearer {create_access_token(other.id, other.role)}"}

    event = _make_event(session, city=city, organizer=organizer, location=location, plan=PlanType.pro)

    response = await client.delete(f"/api/events/{event.id}/flyer/desktop", headers=other_token)

    assert response.status_code == 403


async def test_event_detail_includes_both_flyer_fields(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location
):
    event = _make_event(
        session,
        city=city,
        organizer=organizer,
        location=location,
        plan=PlanType.pro,
        flyer_url_desktop="https://cdn.example/d.jpg",
        flyer_url_mobile="https://cdn.example/m.jpg",
    )

    response = await client.get(f"/api/events/{event.id}")

    assert response.status_code == 200
    body = response.json()
    assert body["flyer_url_desktop"] == "https://cdn.example/d.jpg"
    assert body["flyer_url_mobile"] == "https://cdn.example/m.jpg"
