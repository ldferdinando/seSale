from datetime import date
from uuid import UUID

from sqlmodel import Session, select

from app.models.event import Event, EventStatus
from app.models.location import Location
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


def create_location_report(
    session: Session,
    *,
    location_id: UUID,
    text: str,
    contact_phone: str,
    ip_address: str | None,
) -> Report:
    """Crea un reporte para un lugar gastronómico publicado. Lanza
    LookupError si el lugar no existe o no está visible públicamente
    (mismo criterio que get_gastro_place: is_gastro/is_active/is_public)."""
    location = session.get(Location, location_id)
    if (
        location is None
        or not location.is_gastro
        or not location.is_active
        or not location.is_public
    ):
        raise LookupError("Lugar no encontrado")

    report = Report(
        location_id=location_id,
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
) -> list[tuple[Report, str, str]]:
    """Devuelve (Report, target_title, target_type) — más recientes primero.

    Un reporte tiene event_id O location_id seteado (nunca ambos, ver
    create_report/create_location_report), así que se hace LEFT JOIN contra
    las dos tablas en una sola query: para cada fila, exactamente una de
    Event.title/Location.name viene no-nula y la otra null."""
    stmt = (
        select(Report, Event.title, Location.name)
        .join(Event, Event.id == Report.event_id, isouter=True)
        .join(Location, Location.id == Report.location_id, isouter=True)
    )

    if status is not None:
        stmt = stmt.where(Report.status == status)
    if event_id is not None:
        stmt = stmt.where(Report.event_id == event_id)
    if date_from is not None:
        stmt = stmt.where(Report.created_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(Report.created_at <= date_to)

    stmt = stmt.order_by(Report.created_at.desc())
    rows = session.exec(stmt).all()
    return [
        (report, event_title, "event")
        if report.event_id is not None
        else (report, location_name, "location")
        for report, event_title, location_name in rows
    ]


def get_report_target(session: Session, report: Report) -> tuple[str, str]:
    """(target_title, target_type) para un único Report ya persistido —
    mismo criterio que list_admin_reports, para el endpoint de detalle/PATCH."""
    if report.event_id is not None:
        event = session.get(Event, report.event_id)
        return (event.title if event else ""), "event"
    location = session.get(Location, report.location_id) if report.location_id is not None else None
    return (location.name if location else ""), "location"


def update_report_status(session: Session, report_id: UUID, new_status: str) -> Report:
    report = session.get(Report, report_id)
    if report is None:
        raise LookupError("Reporte no encontrado")

    report.status = new_status
    session.add(report)
    session.commit()
    session.refresh(report)
    return report
