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
