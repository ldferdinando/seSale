from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session

from app.core.config import settings
from app.core.deps import get_client_ip, get_session
from app.core.email import send_report_email
from app.core.limiter import limiter
from app.models.event import Event
from app.schemas.report import ReportCreate, ReportRead
from app.services.report_service import create_report

router = APIRouter(prefix="/api/events", tags=["reports"])


@router.post("/{event_id}/report", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/hour", key_func=get_client_ip)
async def post_event_report(
    request: Request,
    event_id: UUID,
    payload: ReportCreate,
    session: Session = Depends(get_session),
) -> ReportRead:
    try:
        report = create_report(
            session,
            event_id=event_id,
            text=payload.text,
            contact_phone=payload.contact_phone,
            ip_address=get_client_ip(request),
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    event = session.get(Event, event_id)
    event_url = f"{settings.frontend_url}/eventos/{event_id}"
    if event is not None:
        await send_report_email(
            event_title=event.title,
            event_id=event_id,
            report_text=payload.text,
            contact_phone=payload.contact_phone,
            event_url=event_url,
        )

    return report
