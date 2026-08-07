from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlmodel import Session

from app.core.deps import get_current_user, get_session, require_admin
from app.core.limiter import limiter
from app.models.event import EventStatus
from app.models.plan import PlanType
from app.models.user import User
from app.schemas.event import AdminEventRead, EventRead
from app.schemas.user import AdminUserCreate, UserRead
from app.services.event_service import list_admin_events
from app.services.user_service import create_user_by_admin

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/events", response_model=list[AdminEventRead])
@limiter.limit("60/minute")
async def get_admin_events(
    request: Request,
    status_filter: EventStatus | None = Query(default=None, alias="status"),
    city_id: UUID | None = Query(default=None),
    category: str | None = Query(default=None),
    plan: PlanType | None = Query(default=None),
    search: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
) -> list[AdminEventRead]:
    events = list_admin_events(
        session,
        status=status_filter,
        city_id=city_id,
        category=category,
        plan=plan,
        search=search,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )
    return [
        AdminEventRead(
            **EventRead.model_validate(event).model_dump(),
            organizer_public_name=event.organizer.public_name,
            is_active=event.is_active,
        )
        for event in events
    ]


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def post_admin_user(
    payload: AdminUserCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> User:
    try:
        return create_user_by_admin(
            session,
            admin_id=current_user.id,
            email=payload.email,
            password=payload.password,
            public_name=payload.public_name,
            full_name=payload.full_name,
            city_id=payload.city_id,
            role=payload.role,
            doc_type=payload.doc_type,
            doc_number=payload.doc_number,
            phone=payload.phone,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
