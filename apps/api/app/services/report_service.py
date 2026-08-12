from datetime import date
from uuid import UUID

from sqlmodel import Session, select

from app.models.event import Event, EventStatus
from app.models.report import Report


def create_report(
    session: Session,
    *,
    event_id: UUID,
    text: str,
    contact_phone: str,
    ip_address: str | None,
) -> Report:
    """Crea un reporte para un evento aprobado. Lanza LookupError si el
    evento no existe o no está aprobado (404 en el router)."""
    event = session.get(Event, event_id)
    if event is None or event.status != EventStatus.approved:
        raise LookupError("Evento no encontrado")

    report = Report(
        event_id=event_id,
        text=text,
        contact_phone=contact_phone,
        ip_address=ip_address,
    )
    session.add(report)
    session.commit()
    session.refresh(report)
    return report


def list_admin_reports(
    session: Session,
    *,
    status: str | None = None,
    event_id: UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[tuple[Report, str]]:
    """Devuelve (Report, event_title) — más recientes primero."""
    stmt = select(Report, Event.title).join(Event, Event.id == Report.event_id)

    if status is not None:
        stmt = stmt.where(Report.status == status)
    if event_id is not None:
        stmt = stmt.where(Report.event_id == event_id)
    if date_from is not None:
        stmt = stmt.where(Report.created_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(Report.created_at <= date_to)

    stmt = stmt.order_by(Report.created_at.desc())
    return list(session.exec(stmt).all())


def update_report_status(session: Session, report_id: UUID, new_status: str) -> Report:
    report = session.get(Report, report_id)
    if report is None:
        raise LookupError("Reporte no encontrado")

    report.status = new_status
    session.add(report)
    session.commit()
    session.refresh(report)
    return report
