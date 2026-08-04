from sqlalchemy import inspect
from sqlmodel import Session


def test_ad_slots_table_has_expected_columns(session: Session):
    inspector = inspect(session.get_bind())

    assert inspector.has_table("ad_slots")

    columns = {col["name"] for col in inspector.get_columns("ad_slots")}
    assert columns == {
        "id",
        "slot_key",
        "city_id",
        "advertiser_name",
        "img_url",
        "link_url",
        "alt_text",
        "is_active",
        "sort_order",
    }
