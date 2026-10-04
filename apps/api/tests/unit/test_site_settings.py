from httpx import AsyncClient
from sqlmodel import Session

from app.models.site_settings import SITE_SETTINGS_ID, SiteSettings
from app.schemas.site_settings import SiteSettingsUpdate
from app.services.site_settings_service import get_site_settings, update_site_settings


def test_get_site_settings_creates_row_if_missing(session: Session):
    assert session.get(SiteSettings, SITE_SETTINGS_ID) is None

    site_settings = get_site_settings(session)

    assert site_settings.id == SITE_SETTINGS_ID
    assert site_settings.payment_alias is None


def test_update_site_settings_sets_payment_alias(session: Session):
    site_settings = update_site_settings(session, SiteSettingsUpdate(payment_alias="  sesale.pagos  "))

    assert site_settings.payment_alias == "sesale.pagos"
    assert session.get(SiteSettings, SITE_SETTINGS_ID).payment_alias == "sesale.pagos"


def test_update_site_settings_blank_alias_is_saved_as_none(session: Session):
    update_site_settings(session, SiteSettingsUpdate(payment_alias="sesale.pagos"))

    site_settings = update_site_settings(session, SiteSettingsUpdate(payment_alias="   "))

    assert site_settings.payment_alias is None


def test_update_site_settings_omitted_field_keeps_value(session: Session):
    update_site_settings(session, SiteSettingsUpdate(payment_alias="sesale.pagos"))

    site_settings = update_site_settings(session, SiteSettingsUpdate())

    assert site_settings.payment_alias == "sesale.pagos"


async def test_get_public_site_settings_without_alias(client: AsyncClient):
    response = await client.get("/api/site-settings")

    assert response.status_code == 200
    assert response.json() == {"payment_alias": None}


async def test_get_public_site_settings_with_alias(client: AsyncClient, session: Session):
    update_site_settings(session, SiteSettingsUpdate(payment_alias="sesale.pagos"))

    response = await client.get("/api/site-settings")

    assert response.status_code == 200
    assert response.json() == {"payment_alias": "sesale.pagos"}


async def test_patch_admin_site_settings_success(client: AsyncClient, admin_token_headers: dict[str, str]):
    response = await client.patch(
        "/api/admin/site-settings", json={"payment_alias": "sesale.pagos"}, headers=admin_token_headers
    )

    assert response.status_code == 200
    assert response.json()["payment_alias"] == "sesale.pagos"
    public = await client.get("/api/site-settings")
    assert public.json()["payment_alias"] == "sesale.pagos"


async def test_get_admin_site_settings_success(client: AsyncClient, admin_token_headers: dict[str, str]):
    response = await client.get("/api/admin/site-settings", headers=admin_token_headers)

    assert response.status_code == 200
    assert response.json()["payment_alias"] is None
    assert "updated_at" in response.json()


async def test_patch_admin_site_settings_too_long_returns_422(client: AsyncClient, admin_token_headers: dict[str, str]):
    response = await client.patch(
        "/api/admin/site-settings", json={"payment_alias": "x" * 101}, headers=admin_token_headers
    )

    assert response.status_code == 422


async def test_patch_admin_site_settings_by_user_returns_403(client: AsyncClient, user_token_headers: dict[str, str]):
    response = await client.patch(
        "/api/admin/site-settings", json={"payment_alias": "sesale.pagos"}, headers=user_token_headers
    )

    assert response.status_code == 403


async def test_patch_admin_site_settings_without_auth_returns_401(client: AsyncClient):
    response = await client.patch("/api/admin/site-settings", json={"payment_alias": "sesale.pagos"})

    assert response.status_code == 401
