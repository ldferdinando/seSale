from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.core import email as email_module
from app.core.config import settings


def test_send_report_email_skips_when_no_api_key(monkeypatch, caplog):
    monkeypatch.setattr(settings, "resend_api_key", None)

    email_module.send_report_email(
        event_title="Show en el bar",
        event_id=uuid4(),
        report_text="Texto del reporte",
        contact_phone="2984123456",
        event_url="https://sesale.com.ar/eventos/123",
    )
    # No debe lanzar excepción — el reporte ya se guardó igual.


def test_send_report_email_calls_resend_when_configured(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")
    monkeypatch.setattr(settings, "admin_email", "admin@sesale.com.ar")

    sent = {}

    def fake_send(payload):
        sent.update(payload)
        return {"id": "email-1"}

    monkeypatch.setattr(email_module.resend.Emails, "send", fake_send)

    email_module.send_report_email(
        event_title="Show en el bar",
        event_id=uuid4(),
        report_text="Texto del reporte",
        contact_phone="2984123456",
        event_url="https://sesale.com.ar/eventos/123",
    )

    assert sent["to"] == ["admin@sesale.com.ar"]
    assert sent["subject"] == "Reporte de evento: Show en el bar"
    assert "Texto del reporte" in sent["text"]


def test_send_report_email_logs_and_does_not_raise_on_failure(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")

    def fake_send(payload):
        raise RuntimeError("Resend caído")

    monkeypatch.setattr(email_module.resend.Emails, "send", fake_send)

    email_module.send_report_email(
        event_title="Show en el bar",
        event_id=uuid4(),
        report_text="Texto del reporte",
        contact_phone="2984123456",
        event_url="https://sesale.com.ar/eventos/123",
    )
    # No debe propagar la excepción.


def test_send_transfer_notification_to_admin_calls_resend(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")
    monkeypatch.setattr(settings, "admin_email", "admin@sesale.com.ar")

    sent = {}

    def fake_send(payload):
        sent.update(payload)
        return {"id": "email-1"}

    monkeypatch.setattr(email_module.resend.Emails, "send", fake_send)

    email_module.send_transfer_notification_to_admin(
        user_public_name="El Tinglado Bar",
        plan_name="Destacado",
        amount=3500,
        subscription_id=uuid4(),
        transfer_note="Ya transferí",
        admin_panel_url="https://sesale.com.ar",
    )

    assert sent["to"] == ["admin@sesale.com.ar"]
    assert "Destacado" in sent["subject"]
    assert "Ya transferí" in sent["text"]


def test_send_subscription_approved_email_calls_resend(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")

    sent = {}

    def fake_send(payload):
        sent.update(payload)
        return {"id": "email-1"}

    monkeypatch.setattr(email_module.resend.Emails, "send", fake_send)

    email_module.send_subscription_approved_email(
        user_email="organizador@sesale.com.ar",
        user_public_name="El Tinglado Bar",
        plan_name="Destacado",
        expires_at=datetime(2026, 9, 12, 15, 0, tzinfo=timezone.utc),
    )

    assert sent["to"] == ["organizador@sesale.com.ar"]
    assert "Destacado" in sent["subject"]
    assert "septiembre" in sent["text"]


def test_send_subscription_rejected_email_includes_admin_notes(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")

    sent = {}

    def fake_send(payload):
        sent.update(payload)
        return {"id": "email-1"}

    monkeypatch.setattr(email_module.resend.Emails, "send", fake_send)

    email_module.send_subscription_rejected_email(
        user_email="organizador@sesale.com.ar",
        user_public_name="El Tinglado Bar",
        plan_name="Destacado",
        admin_notes="No encontramos el pago",
    )

    assert sent["to"] == ["organizador@sesale.com.ar"]
    assert "No encontramos el pago" in sent["text"]


def test_transfer_notification_skips_when_no_api_key(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", None)

    email_module.send_transfer_notification_to_admin(
        user_public_name="El Tinglado Bar",
        plan_name="Destacado",
        amount=3500,
        subscription_id=uuid4(),
        transfer_note=None,
        admin_panel_url="https://sesale.com.ar",
    )
    # No debe lanzar excepción.


# Etapa 11a — recuperación de contraseña: send_password_reset_email.


def test_send_password_reset_email_skips_when_no_api_key(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", None)

    email_module.send_password_reset_email(
        user_email="organizador@sesale.com.ar",
        user_name="El Tinglado Bar",
        reset_url="https://sesale.com.ar/reset-contrasena?token=abc123",
    )
    # No debe lanzar excepción.


def test_send_password_reset_email_calls_resend_when_configured(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")

    sent = {}

    def fake_send(payload):
        sent.update(payload)
        return {"id": "email-1"}

    monkeypatch.setattr(email_module.resend.Emails, "send", fake_send)

    email_module.send_password_reset_email(
        user_email="organizador@sesale.com.ar",
        user_name="El Tinglado Bar",
        reset_url="https://sesale.com.ar/reset-contrasena?token=abc123",
    )

    assert sent["to"] == ["organizador@sesale.com.ar"]
    assert sent["subject"] == "Recuperá tu contraseña — seSALE"
    assert "https://sesale.com.ar/reset-contrasena?token=abc123" in sent["text"]
    assert "vence en 1 hora" in sent["text"]


def test_send_password_reset_email_logs_and_does_not_raise_on_failure(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")

    def fake_send(payload):
        raise RuntimeError("Resend caído")

    monkeypatch.setattr(email_module.resend.Emails, "send", fake_send)

    email_module.send_password_reset_email(
        user_email="organizador@sesale.com.ar",
        user_name="El Tinglado Bar",
        reset_url="https://sesale.com.ar/reset-contrasena?token=abc123",
    )
    # No debe lanzar excepción — el token ya se guardó igual.


# Remitente configurable: RESEND_FROM_EMAIL + RESEND_REPLY_TO opcional.


def _capture_sends(monkeypatch) -> list[dict]:
    sent: list[dict] = []

    def fake_send(payload):
        sent.append(payload)
        return {"id": "email-1"}

    monkeypatch.setattr(email_module.resend.Emails, "send", fake_send)
    return sent


def _send_all_emails() -> None:
    """Dispara las seis funciones de envío del módulo."""
    email_module.send_report_email(
        event_title="Show", event_id=uuid4(), report_text="x",
        contact_phone="2984123456", event_url="https://sesale.com.ar/eventos/1",
    )
    email_module.send_location_report_email(
        location_name="Bar", location_id=uuid4(), report_text="x",
        contact_phone="2984123456", location_url="https://sesale.com.ar/gastro/1",
    )
    email_module.send_transfer_notification_to_admin(
        user_public_name="Org", plan_name="Destacado", amount=3500,
        subscription_id=uuid4(), transfer_note=None, admin_panel_url="https://sesale.com.ar",
    )
    email_module.send_subscription_approved_email(
        user_email="org@example.com", user_public_name="Org", plan_name="Destacado",
        expires_at=datetime(2026, 9, 12, 15, 0, tzinfo=timezone.utc),
    )
    email_module.send_password_reset_email(
        user_email="org@example.com", user_name="Org", reset_url="https://sesale.com.ar/r?t=1",
    )
    email_module.send_subscription_rejected_email(
        user_email="org@example.com", user_public_name="Org", plan_name="Destacado", admin_notes=None,
    )


def test_all_emails_use_configured_from_without_reply_to(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")
    monkeypatch.setattr(settings, "resend_from_email", "seSALE <onboarding@resend.dev>")
    monkeypatch.setattr(settings, "resend_reply_to", None)
    sent = _capture_sends(monkeypatch)

    _send_all_emails()

    assert len(sent) == 6
    for payload in sent:
        assert payload["from"] == "seSALE <onboarding@resend.dev>"
        assert "reply_to" not in payload


def test_all_emails_include_reply_to_when_configured(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")
    monkeypatch.setattr(settings, "resend_from_email", "seSALE <hola@midominio.com>")
    monkeypatch.setattr(settings, "resend_reply_to", "consultas@example.com")
    sent = _capture_sends(monkeypatch)

    _send_all_emails()

    assert len(sent) == 6
    for payload in sent:
        assert payload["from"] == "seSALE <hola@midominio.com>"
        assert payload["reply_to"] == "consultas@example.com"


def test_settings_read_sender_from_env_and_treat_blank_as_unset(monkeypatch):
    from app.core.config import Settings

    monkeypatch.setenv("RESEND_FROM_EMAIL", "seSALE <hola@midominio.com>")
    monkeypatch.setenv("RESEND_REPLY_TO", "consultas@example.com")
    configured = Settings(_env_file=None)
    assert configured.resend_from_email == "seSALE <hola@midominio.com>"
    assert configured.resend_reply_to == "consultas@example.com"

    monkeypatch.setenv("RESEND_FROM_EMAIL", "")
    monkeypatch.setenv("RESEND_REPLY_TO", "")
    blank = Settings(_env_file=None)
    assert blank.resend_from_email == "seSALE <onboarding@resend.dev>"
    assert blank.resend_reply_to is None


# Aviso "Tuve un problema" de un pago de MercadoPago pendiente.


def _payment_problem_kwargs(**overrides) -> dict:
    kwargs = dict(
        user_public_name="El Tinglado Bar",
        user_email="organizador@sesale.com.ar",
        plan_name="Destacado",
        event_title="Show en vivo",
        amount=3500,
        subscription_id=uuid4(),
        problem_note="Me rechazó la tarjeta",
        admin_panel_url="https://sesale.com.ar",
    )
    kwargs.update(overrides)
    return kwargs


def test_send_payment_problem_notification_calls_resend(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")
    monkeypatch.setattr(settings, "admin_email", "admin@sesale.com.ar")
    sent = {}
    monkeypatch.setattr(email_module.resend.Emails, "send", lambda payload: sent.update(payload))

    email_module.send_payment_problem_notification_to_admin(**_payment_problem_kwargs())

    assert sent["to"] == ["admin@sesale.com.ar"]
    assert "Destacado" in sent["subject"]
    assert "Me rechazó la tarjeta" in sent["text"]
    assert "Show en vivo" in sent["text"]
    assert "organizador@sesale.com.ar" in sent["text"]


def test_payment_problem_notification_skips_when_no_api_key(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", None)

    email_module.send_payment_problem_notification_to_admin(**_payment_problem_kwargs(problem_note=None))
    # No debe lanzar excepción.


def test_payment_problem_notification_swallows_resend_errors(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")

    def boom(payload):
        raise RuntimeError("resend caído")

    monkeypatch.setattr(email_module.resend.Emails, "send", boom)

    email_module.send_payment_problem_notification_to_admin(**_payment_problem_kwargs(event_title=None))
    # No debe propagar la excepción.
