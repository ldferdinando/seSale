from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.core import email as email_module
from app.core.config import settings


async def test_send_report_email_skips_when_no_api_key(monkeypatch, caplog):
    monkeypatch.setattr(settings, "resend_api_key", None)

    await email_module.send_report_email(
        event_title="Show en el bar",
        event_id=uuid4(),
        report_text="Texto del reporte",
        contact_phone="2984123456",
        event_url="https://sesale.com.ar/eventos/123",
    )
    # No debe lanzar excepción — el reporte ya se guardó igual.


async def test_send_report_email_calls_resend_when_configured(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")
    monkeypatch.setattr(settings, "admin_email", "admin@sesale.com.ar")

    sent = {}

    def fake_send(payload):
        sent.update(payload)
        return {"id": "email-1"}

    monkeypatch.setattr(email_module.resend.Emails, "send", fake_send)

    await email_module.send_report_email(
        event_title="Show en el bar",
        event_id=uuid4(),
        report_text="Texto del reporte",
        contact_phone="2984123456",
        event_url="https://sesale.com.ar/eventos/123",
    )

    assert sent["to"] == ["admin@sesale.com.ar"]
    assert sent["subject"] == "Reporte de evento: Show en el bar"
    assert "Texto del reporte" in sent["text"]


async def test_send_report_email_logs_and_does_not_raise_on_failure(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")

    def fake_send(payload):
        raise RuntimeError("Resend caído")

    monkeypatch.setattr(email_module.resend.Emails, "send", fake_send)

    await email_module.send_report_email(
        event_title="Show en el bar",
        event_id=uuid4(),
        report_text="Texto del reporte",
        contact_phone="2984123456",
        event_url="https://sesale.com.ar/eventos/123",
    )
    # No debe propagar la excepción.


async def test_send_transfer_notification_to_admin_calls_resend(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")
    monkeypatch.setattr(settings, "admin_email", "admin@sesale.com.ar")

    sent = {}

    def fake_send(payload):
        sent.update(payload)
        return {"id": "email-1"}

    monkeypatch.setattr(email_module.resend.Emails, "send", fake_send)

    await email_module.send_transfer_notification_to_admin(
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


async def test_send_subscription_approved_email_calls_resend(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")

    sent = {}

    def fake_send(payload):
        sent.update(payload)
        return {"id": "email-1"}

    monkeypatch.setattr(email_module.resend.Emails, "send", fake_send)

    await email_module.send_subscription_approved_email(
        user_email="organizador@sesale.com.ar",
        user_public_name="El Tinglado Bar",
        plan_name="Destacado",
        expires_at=datetime(2026, 9, 12, 15, 0, tzinfo=timezone.utc),
    )

    assert sent["to"] == ["organizador@sesale.com.ar"]
    assert "Destacado" in sent["subject"]
    assert "septiembre" in sent["text"]


async def test_send_subscription_rejected_email_includes_admin_notes(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")

    sent = {}

    def fake_send(payload):
        sent.update(payload)
        return {"id": "email-1"}

    monkeypatch.setattr(email_module.resend.Emails, "send", fake_send)

    await email_module.send_subscription_rejected_email(
        user_email="organizador@sesale.com.ar",
        user_public_name="El Tinglado Bar",
        plan_name="Destacado",
        admin_notes="No encontramos el pago",
    )

    assert sent["to"] == ["organizador@sesale.com.ar"]
    assert "No encontramos el pago" in sent["text"]


async def test_transfer_notification_skips_when_no_api_key(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", None)

    await email_module.send_transfer_notification_to_admin(
        user_public_name="El Tinglado Bar",
        plan_name="Destacado",
        amount=3500,
        subscription_id=uuid4(),
        transfer_note=None,
        admin_panel_url="https://sesale.com.ar",
    )
    # No debe lanzar excepción.
