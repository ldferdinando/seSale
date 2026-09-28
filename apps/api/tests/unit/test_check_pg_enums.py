"""Tests de scripts/check_pg_enums.py — guardia de CI de enums nativos.

La consulta real a `pg_enum` solo corre contra Postgres (en CI, después de
`alembic upgrade head`); acá se testea la lógica pura: qué columnas se
detectan en los modelos y cómo se clasifican las diferencias.
"""

import sqlalchemy as sa
from sqlmodel import SQLModel

from app.models.subscription import SubscriptionStatus
from scripts.check_pg_enums import EnumColumn, compare_enums, expected_native_enums

SUB_LABELS = ("active", "expired", "cancelled", "pending_payment", "pending_approval")


def _actual(*cols: EnumColumn) -> dict[tuple[str, str], EnumColumn]:
    return {(c.table, c.column): c for c in cols}


def test_expected_native_enums_from_models():
    expected = {(c.table, c.column): c for c in expected_native_enums(SQLModel.metadata)}

    assert set(expected) == {
        ("plans", "plan_type"),
        ("plans", "pricing_type"),
        ("events", "status"),
        ("events", "plan"),
        ("events", "ticket_type"),
        ("subscriptions", "status"),
    }
    sub = expected[("subscriptions", "status")]
    assert sub.type_name == "subscriptionstatus"
    assert sub.labels == tuple(s.value for s in SubscriptionStatus)


def test_expected_native_enums_ignores_non_native():
    metadata = sa.MetaData()
    sa.Table(
        "t",
        metadata,
        sa.Column("native", sa.Enum("a", "b", name="nativetype")),
        sa.Column("varchar", sa.Enum("a", "b", name="vtype", native_enum=False)),
        sa.Column("plain", sa.String()),
    )

    assert expected_native_enums(metadata) == [EnumColumn("t", "native", "nativetype", ("a", "b"))]


def test_compare_enums_ok():
    exp = EnumColumn("subscriptions", "status", "subscriptionstatus", SUB_LABELS)

    assert compare_enums([exp], _actual(exp)) == ([], [])


def test_compare_enums_missing_label_is_error():
    exp = EnumColumn("subscriptions", "status", "subscriptionstatus", SUB_LABELS)
    act = EnumColumn(
        "subscriptions", "status", "subscriptionstatus", ("active", "expired", "cancelled", "pending_approval")
    )

    errors, warnings = compare_enums([exp], _actual(act))

    assert warnings == []
    assert len(errors) == 1
    assert "subscriptions.status" in errors[0]
    assert "subscriptionstatus" in errors[0]
    assert "['pending_payment']" in errors[0]


def test_compare_enums_extra_label_is_warning():
    exp = EnumColumn("events", "plan", "plantype", ("gratis", "dest"))
    act = EnumColumn("events", "plan", "plantype", ("gratis", "dest", "legacy"))

    errors, warnings = compare_enums([exp], _actual(act))

    assert errors == []
    assert len(warnings) == 1
    assert "['legacy']" in warnings[0]


def test_compare_enums_missing_column_is_error():
    exp = EnumColumn("events", "status", "eventstatus", ("pending",))

    errors, warnings = compare_enums([exp], {})

    assert warnings == []
    assert len(errors) == 1
    assert "events.status" in errors[0]


def test_compare_enums_type_mismatch_is_error():
    exp = EnumColumn("events", "plan", "plantype", ("gratis", "dest", "pro", "banner"))
    act = EnumColumn("events", "plan", "eventplan", ("gratis", "dest", "pro"))

    errors, warnings = compare_enums([exp], _actual(act))

    assert warnings == []
    assert len(errors) == 1
    assert "'eventplan'" in errors[0] and "'plantype'" in errors[0]
