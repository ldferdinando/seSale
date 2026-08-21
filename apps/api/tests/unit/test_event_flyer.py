"""Etapa 8b — POST/DELETE /api/events/{id}/flyer.

El flyer es exclusivo del plan Destacado Plus (`pro`) — ver a_revisar.md
(confirmado con el usuario: seSALE_primario.html solo muestra la subida de
flyer con Destacado Plus, nunca con Destacado).
"""

from datetime import date, time
from unittest.mock import patch

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


async def test_upload_flyer_with_plan_gratis_returns_400(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, user_token_headers
):
    event = _make_event(session, city=city, organizer=organizer, location=location, plan=PlanType.gratis)

    response = await client.post(
        f"/api/events/{event.id}/flyer", files=_png_file(), headers=user_token_headers
    )

    assert response.status_code == 400
    assert "Gratuito" in response.json()["detail"]


async def test_upload_flyer_with_plan_dest_returns_400(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, user_token_headers
):
    event = _make_event(session, city=city, organizer=organizer, location=location, plan=PlanType.dest)

    response = await client.post(
        f"/api/events/{event.id}/flyer", files=_png_file(), headers=user_token_headers
    )

    assert response.status_code == 400
    assert "Destacado" in response.json()["detail"]


async def test_upload_flyer_invalid_format_returns_422(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, user_token_headers
):
    event = _make_event(session, city=city, organizer=organizer, location=location, plan=PlanType.pro)

    response = await client.post(
        f"/api/events/{event.id}/flyer",
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
        f"/api/events/{event.id}/flyer",
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

    response = await client.post(f"/api/events/{event.id}/flyer", files=_png_file(), headers=other_token)

    assert response.status_code == 403


async def test_upload_flyer_event_not_found_returns_404(client: AsyncClient, user_token_headers):
    import uuid

    response = await client.post(
        f"/api/events/{uuid.uuid4()}/flyer", files=_png_file(), headers=user_token_headers
    )

    assert response.status_code == 404


async def test_upload_flyer_with_plan_pro_succeeds_and_updates_flyer_url(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, user_token_headers, tmp_path
):
    event = _make_event(session, city=city, organizer=organizer, location=location, plan=PlanType.pro)

    with patch("app.core.storage._UPLOADS_DIR", tmp_path):
        response = await client.post(
            f"/api/events/{event.id}/flyer", files=_png_file(), headers=user_token_headers
        )

    assert response.status_code == 200
    body = response.json()
    assert body["flyer_url"]
    assert str(event.id) in body["flyer_url"]

    session.refresh(event)
    assert event.flyer_url == body["flyer_url"]


async def test_upload_flyer_replaces_previous_file(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, user_token_headers, tmp_path
):
    event = _make_event(session, city=city, organizer=organizer, location=location, plan=PlanType.pro)

    with patch("app.core.storage._UPLOADS_DIR", tmp_path):
        first = await client.post(
            f"/api/events/{event.id}/flyer", files=_png_file("primero.png"), headers=user_token_headers
        )
        assert first.status_code == 200
        event_dir = tmp_path / str(event.id)
        assert len(list(event_dir.iterdir())) == 1

        second = await client.post(
            f"/api/events/{event.id}/flyer", files=_png_file("segundo.png"), headers=user_token_headers
        )
        assert second.status_code == 200
        # se reemplaza el archivo anterior — no queda más de uno en el
        # directorio del evento (no se acumulan huérfanos)
        assert len(list(event_dir.iterdir())) == 1


async def test_delete_flyer_returns_200_and_clears_flyer_url(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, user_token_headers, tmp_path
):
    event = _make_event(session, city=city, organizer=organizer, location=location, plan=PlanType.pro)

    with patch("app.core.storage._UPLOADS_DIR", tmp_path):
        upload = await client.post(
            f"/api/events/{event.id}/flyer", files=_png_file(), headers=user_token_headers
        )
        assert upload.status_code == 200

        response = await client.delete(f"/api/events/{event.id}/flyer", headers=user_token_headers)

    assert response.status_code == 200
    assert response.json()["flyer_url"] is None

    session.refresh(event)
    assert event.flyer_url is None


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

    response = await client.delete(f"/api/events/{event.id}/flyer", headers=other_token)

    assert response.status_code == 403


async def test_upload_flyer_by_admin_on_other_organizers_event_succeeds(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, admin_token_headers, tmp_path
):
    event = _make_event(session, city=city, organizer=organizer, location=location, plan=PlanType.pro)

    with patch("app.core.storage._UPLOADS_DIR", tmp_path):
        response = await client.post(
            f"/api/events/{event.id}/flyer", files=_png_file(), headers=admin_token_headers
        )

    assert response.status_code == 200
