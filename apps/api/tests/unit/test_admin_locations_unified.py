"""Etapa "Unificar panel admin de Lugares" — un solo alta/edición para
cualquier Location. Cubre los 3 casos de visibilidad:

1. Selector de lugares del formulario de evento (GET /api/locations): activo
   y público, SIN importar si tiene tipos asignados.
2. Gastronomía (GET /api/gastro + grupo "gastro" del catálogo): activo,
   público y con al menos un tipo del grupo "gastro".
3. Espacios (GET /api/gastro + grupo "espacios"): activo, público y con al
   menos un tipo del grupo "espacios".

La sección pública arma Gastronomía/Espacios filtrando GET /api/gastro por
el grupo de cada tipo (ver app/lugares/page.tsx); acá se verifica que el
lugar llegue al endpoint con los tipos del grupo correcto.
"""

from httpx import AsyncClient
from sqlmodel import Session, select

from app.models import City, Location, LocationGastroType
from app.models.gastro_type_catalog import GastroTypeCatalog

OPENING_HOURS = {"lunes": {"open": "09:00", "close": "22:00"}, "domingo": None}

CONTACT = {
    "gastro_whatsapp": "5492984000001",
    "gastro_instagram": "venue",
    "gastro_web": "https://venue.example.com",
    "gastro_email": "hola@venue.example.com",
    "gastro_facebook": "venuefb",
    "gastro_phone": "2984123456",
}


def _groups_of(session: Session, keys: list[str]) -> set[str]:
    if not keys:
        return set()
    return set(session.exec(select(GastroTypeCatalog.grupo).where(GastroTypeCatalog.key.in_(keys))))


async def _visibility(client: AsyncClient, session: Session, city: City, location_id: str) -> dict[str, bool]:
    selector = await client.get("/api/locations", params={"city_id": str(city.id)})
    gastro = await client.get("/api/gastro", params={"city_id": str(city.id)})
    place = next((p for p in gastro.json() if p["id"] == location_id), None)
    groups = _groups_of(session, place["gastro_types"]) if place else set()
    return {
        "selector": any(loc["id"] == location_id for loc in selector.json()),
        "gastronomia": "gastro" in groups,
        "espacios": "espacios" in groups,
    }


async def _create(client: AsyncClient, city: City, headers: dict[str, str], **extra) -> dict:
    payload = {"name": "La Esquina", "address": "Mitre 100", "city_id": str(city.id), **extra}
    response = await client.post("/api/admin/locations", json=payload, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


async def test_location_without_types_only_in_event_selector(
    client: AsyncClient, session: Session, city: City, admin_token_headers: dict[str, str]
):
    body = await _create(client, city, admin_token_headers)

    assert body["gastro_types"] == []
    assert body["is_gastro"] is False
    assert await _visibility(client, session, city, body["id"]) == {
        "selector": True,
        "gastronomia": False,
        "espacios": False,
    }


async def test_adding_gastro_type_shows_in_gastronomia_and_enables_gastro_fields(
    client: AsyncClient, session: Session, city: City, admin_token_headers: dict[str, str]
):
    body = await _create(client, city, admin_token_headers)

    response = await client.put(
        f"/api/admin/locations/{body['id']}",
        json={
            "gastro_types": ["bar"],
            "opening_hours": OPENING_HOURS,
            "price_range": "$$",
            "has_delivery": True,
            "has_reservations": True,
        },
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    updated = response.json()
    assert updated["is_gastro"] is True
    assert updated["opening_hours"] == OPENING_HOURS
    assert updated["price_range"] == "$$"
    assert updated["has_delivery"] is True
    assert updated["has_reservations"] is True
    assert await _visibility(client, session, city, body["id"]) == {
        "selector": True,
        "gastronomia": True,
        "espacios": False,
    }


async def test_adding_espacios_type_shows_in_espacios_with_hours_but_no_gastro_fields(
    client: AsyncClient, session: Session, city: City, admin_token_headers: dict[str, str]
):
    body = await _create(client, city, admin_token_headers)

    response = await client.put(
        f"/api/admin/locations/{body['id']}",
        json={
            "gastro_types": ["club"],
            "opening_hours": OPENING_HOURS,
            # Precio/delivery/reservas son solo del grupo Gastronomía: se ignoran.
            "price_range": "$$",
            "has_delivery": True,
        },
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    updated = response.json()
    assert updated["is_gastro"] is True
    assert updated["opening_hours"] == OPENING_HOURS
    assert updated["price_range"] is None
    assert updated["has_delivery"] is False
    assert await _visibility(client, session, city, body["id"]) == {
        "selector": True,
        "gastronomia": False,
        "espacios": True,
    }


async def test_location_with_both_groups_shows_everywhere(
    client: AsyncClient, session: Session, city: City, admin_token_headers: dict[str, str]
):
    body = await _create(client, city, admin_token_headers, gastro_types=["bar", "club"])

    assert await _visibility(client, session, city, body["id"]) == {
        "selector": True,
        "gastronomia": True,
        "espacios": True,
    }


async def test_removing_all_types_hides_from_gastro_and_resets_type_fields(
    client: AsyncClient, session: Session, city: City, admin_token_headers: dict[str, str]
):
    body = await _create(
        client,
        city,
        admin_token_headers,
        gastro_types=["bar"],
        opening_hours=OPENING_HOURS,
        price_range="$",
        has_reservations=True,
    )
    await client.patch(
        f"/api/admin/gastro/{body['id']}/plan", json={"plan": "dest"}, headers=admin_token_headers
    )

    response = await client.put(
        f"/api/admin/locations/{body['id']}", json={"gastro_types": []}, headers=admin_token_headers
    )

    assert response.status_code == 200
    updated = response.json()
    assert updated["is_gastro"] is False
    assert updated["gastro_types"] == []
    assert updated["opening_hours"] is None
    assert updated["price_range"] is None
    assert updated["has_reservations"] is False
    assert updated["plan"] == "gratis"
    assert updated["featured_until"] is None
    assert session.exec(
        select(LocationGastroType).where(LocationGastroType.location_id == body["id"])
    ).all() == []
    assert await _visibility(client, session, city, body["id"]) == {
        "selector": True,
        "gastronomia": False,
        "espacios": False,
    }


async def test_contact_fields_available_without_types(
    client: AsyncClient, city: City, admin_token_headers: dict[str, str]
):
    body = await _create(client, city, admin_token_headers, **CONTACT)

    assert body["is_gastro"] is False
    for field, value in CONTACT.items():
        assert body[field] == value

    response = await client.put(
        f"/api/admin/locations/{body['id']}",
        json={"gastro_whatsapp": "5492984999999", "gastro_email": None},
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["gastro_whatsapp"] == "5492984999999"
    assert response.json()["gastro_email"] is None
    assert response.json()["gastro_instagram"] == CONTACT["gastro_instagram"]


async def test_contact_fields_editable_with_types(
    client: AsyncClient, city: City, admin_token_headers: dict[str, str]
):
    body = await _create(client, city, admin_token_headers, gastro_types=["club"])

    response = await client.put(
        f"/api/admin/locations/{body['id']}", json=CONTACT, headers=admin_token_headers
    )

    assert response.status_code == 200
    for field, value in CONTACT.items():
        assert response.json()[field] == value


async def test_inactive_location_not_in_event_selector_nor_gastro(
    client: AsyncClient, session: Session, city: City, admin_token_headers: dict[str, str]
):
    body = await _create(client, city, admin_token_headers, gastro_types=["bar"])

    response = await client.put(
        f"/api/admin/locations/{body['id']}", json={"is_active": False}, headers=admin_token_headers
    )

    assert response.status_code == 200
    assert await _visibility(client, session, city, body["id"]) == {
        "selector": False,
        "gastronomia": False,
        "espacios": False,
    }


async def test_private_location_not_in_event_selector_nor_gastro(
    client: AsyncClient, session: Session, city: City, admin_token_headers: dict[str, str]
):
    body = await _create(client, city, admin_token_headers, gastro_types=["club"])

    await client.put(
        f"/api/admin/locations/{body['id']}", json={"is_public": False}, headers=admin_token_headers
    )

    assert await _visibility(client, session, city, body["id"]) == {
        "selector": False,
        "gastronomia": False,
        "espacios": False,
    }


async def test_put_admin_location_invalid_type_returns_422(
    client: AsyncClient, city: City, admin_token_headers: dict[str, str]
):
    body = await _create(client, city, admin_token_headers)

    response = await client.put(
        f"/api/admin/locations/{body['id']}", json={"gastro_types": ["sushi"]}, headers=admin_token_headers
    )

    assert response.status_code == 422


async def test_get_admin_locations_filters_by_grupo(
    client: AsyncClient, city: City, admin_token_headers: dict[str, str]
):
    await _create(client, city, admin_token_headers, name="Sin tipo")
    await _create(client, city, admin_token_headers, name="Bar", gastro_types=["bar"])
    await _create(client, city, admin_token_headers, name="Club", gastro_types=["club"])

    async def names(grupo: str) -> set[str]:
        response = await client.get(
            "/api/admin/locations", params={"grupo": grupo}, headers=admin_token_headers
        )
        assert response.status_code == 200
        return {loc["name"] for loc in response.json()}

    assert await names("none") == {"Sin tipo"}
    assert await names("gastro") == {"Bar"}
    assert await names("espacios") == {"Club"}


async def test_get_admin_locations_invalid_grupo_returns_422(
    client: AsyncClient, admin_token_headers: dict[str, str]
):
    response = await client.get(
        "/api/admin/locations", params={"grupo": "otro"}, headers=admin_token_headers
    )

    assert response.status_code == 422


async def test_get_admin_locations_filters_by_is_active(
    client: AsyncClient, session: Session, city: City, admin_token_headers: dict[str, str]
):
    session.add(Location(name="Activo", address="A 1", city_id=city.id, is_public=True, is_active=True))
    session.add(Location(name="Inactivo", address="B 2", city_id=city.id, is_public=True, is_active=False))
    session.commit()

    response = await client.get(
        "/api/admin/locations", params={"is_active": "false"}, headers=admin_token_headers
    )

    assert response.status_code == 200
    assert {loc["name"] for loc in response.json()} == {"Inactivo"}


async def test_cover_upload_requires_gastro_group_type(
    client: AsyncClient, city: City, admin_token_headers: dict[str, str]
):
    body = await _create(client, city, admin_token_headers, gastro_types=["club"])

    response = await client.post(
        f"/api/admin/gastro/{body['id']}/cover",
        files={"file": ("cover.jpg", b"x", "image/jpeg")},
        headers=admin_token_headers,
    )

    assert response.status_code == 404
