from sqlalchemy import inspect
from sqlmodel import Session


def test_ad_slots_table_has_expected_columns(session: Session):
    """Etapa 8d-pre: ad_slots pasó a modelar solo el ESPACIO publicitario
    (posición fija) — el contenido (imagen/link/vigencia/anunciante) se
    movió a la tabla nueva ad_items. Ver ARCHITECTURE.md."""
    inspector = inspect(session.get_bind())

    assert inspector.has_table("ad_slots")

    columns = {col["name"] for col in inspector.get_columns("ad_slots")}
    assert columns == {
        "id",
        "city_id",
        "section",
        "slot_position",
        "rotation_mode",
        "rotation_interval_seconds",
        "is_active",
        "created_at",
    }


def test_ad_items_table_has_expected_columns(session: Session):
    inspector = inspect(session.get_bind())

    assert inspector.has_table("ad_items")

    columns = {col["name"] for col in inspector.get_columns("ad_items")}
    assert columns == {
        "id",
        "slot_id",
        "user_id",
        "img_url",
        "link_url",
        "alt_text",
        "advertiser_name",
        "starts_at",
        "ends_at",
        "status",
        "display_order",
        "created_by",
        "created_at",
        "updated_at",
    }
