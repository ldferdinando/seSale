import hashlib
import hmac

from app.services.payment_service import verify_mp_signature

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
