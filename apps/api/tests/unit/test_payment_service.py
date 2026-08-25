import hashlib
import hmac
from datetime import date, time

import pytest
from sqlmodel import Session

from app.core.config import settings
from app.models.city import City
from app.models.event import Event, EventStatus
from app.models.location import Location
from app.models.plan import Plan
from app.models.user import User
from app.services.payment_service import create_checkout_preference, verify_mp_signature

SECRET = "test-secret"


def _valid_signature(notification_id: str, request_id: str, ts: str = "123") -> tuple[str, str]:
    manifest = f"id:{notification_id};request-id:{request_id};ts:{ts};"
    v1 = hmac.new(SECRET.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    return f"ts={ts},v1={v1}", request_id


def test_verify_mp_signature_accepts_correct_manifest():
    header, request_id = _valid_signature("42", "req-1")

    assert verify_mp_signature(x_signature=header, x_request_id=request_id, notification_id="42", secret=SECRET)


def test_verify_mp_signature_rejects_wrong_secret():
    header, request_id = _valid_signature("42", "req-1")

    assert not verify_mp_signature(x_signature=header, x_request_id=request_id, notification_id="42", secret="otro-secret")


def test_verify_mp_signature_rejects_tampered_notification_id():
    header, request_id = _valid_signature("42", "req-1")

    assert not verify_mp_signature(x_signature=header, x_request_id=request_id, notification_id="99", secret=SECRET)


def test_verify_mp_signature_rejects_missing_signature():
    assert not verify_mp_signature(x_signature=None, x_request_id="req-1", notification_id="42", secret=SECRET)


def test_verify_mp_signature_rejects_malformed_header():
    assert not verify_mp_signature(x_signature="not-a-valid-header", x_request_id="req-1", notification_id="42", secret=SECRET)


def test_verify_mp_signature_rejects_empty_secret_even_with_matching_hmac():
    # Etapa 9c: si MERCADOPAGO_WEBHOOK_SECRET no está configurada (queda ""),
    # no hay que aceptar un webhook solo porque su firma matchea un HMAC
    # calculado con clave vacía (cualquiera puede calcular ese mismo hash).
    header, request_id = _valid_signature("42", "req-1", ts="123")
    empty_secret_manifest = "id:42;request-id:req-1;ts:123;"
    v1_with_empty_secret = hmac.new(b"", empty_secret_manifest.encode(), hashlib.sha256).hexdigest()
    forged_header = f"ts=123,v1={v1_with_empty_secret}"

    assert not verify_mp_signature(
        x_signature=forged_header, x_request_id=request_id, notification_id="42", secret=""
    )


# Los tests de vencimiento (antes expire_subscriptions) viven ahora en
# tests/unit/test_expiry.py — la función se movió a app/core/expiry.py
# (expire_overdue_subscriptions) en la Etapa 8c.


def test_create_checkout_preference_without_mp_token_raises_friendly_value_error(
    session: Session,
    monkeypatch: pytest.MonkeyPatch,
    plan_dest: Plan,
    plan_price_dest,
    city: City,
    organizer: User,
    location: Location,
):
    # Etapa 11a — BUG 2: sin MERCADOPAGO_ACCESS_TOKEN configurado (pagos
    # manuales por ahora), la función no debe llegar a instanciar
    # `mercadopago.SDK(None)` — eso lanzaría el `ValueError` interno de la
    # librería ("Param access_token must be a String") con un mensaje que
    # no tiene sentido para quien usa la app.
    monkeypatch.setattr(settings, "mercadopago_access_token", None)
    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title="Show en vivo",
        date=date.today(),
        time=time(21, 0),
        time_end=time(23, 0),
        status=EventStatus.approved,
        is_active=True,
    )
    session.add(event)
    session.commit()
    session.refresh(event)

    with pytest.raises(ValueError, match="MercadoPago no está disponible"):
        create_checkout_preference(session, user=organizer, plan_id=plan_dest.id, event_id=event.id)
