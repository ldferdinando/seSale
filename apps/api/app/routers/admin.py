from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from app.core.deps import get_current_user, get_session, require_admin
from app.core.limiter import limiter
from app.models.event import Event, EventStatus
from app.models.plan import PlanType
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.user import User
from app.schemas.event import AdminEventRead, EventRead
from app.schemas.report import AdminReportRead, ReportStatusUpdate
from app.schemas.subscription import AdminSubscriptionRead, SubscriptionActivateRequest
from app.schemas.user import AdminUserCreate, UserRead
from app.services.event_service import list_admin_events
from app.services.payment_service import activate_subscription_manually, expire_subscriptions
from app.services.report_service import list_admin_reports, update_report_status
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


@router.get("/subscriptions", response_model=list[AdminSubscriptionRead])
@limiter.limit("60/minute")
async def get_admin_subscriptions(
    request: Request,
    status_filter: SubscriptionStatus | None = Query(default=None, alias="status"),
    plan_id: UUID | None = Query(default=None),
    user_id: UUID | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[AdminSubscriptionRead]:
    stmt = select(Subscription).options(
        selectinload(Subscription.plan),
        selectinload(Subscription.plan_price),
        selectinload(Subscription.user),
    )
    if status_filter is not None:
        stmt = stmt.where(Subscription.status == status_filter)
    if plan_id is not None:
        stmt = stmt.where(Subscription.plan_id == plan_id)
    if user_id is not None:
        stmt = stmt.where(Subscription.user_id == user_id)
    if date_from is not None:
        stmt = stmt.where(Subscription.created_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(Subscription.created_at <= date_to)
    stmt = stmt.order_by(Subscription.created_at.desc())

    subscriptions = session.exec(stmt).all()
    return [
        AdminSubscriptionRead(
            id=sub.id,
            plan_id=sub.plan_id,
            plan_name=sub.plan.name,
            plan_type=sub.plan.plan_type,
            status=sub.status,
            starts_at=sub.starts_at,
            expires_at=sub.expires_at,
            amount_paid=sub.amount_paid,
            currency=sub.currency,
            promo_label=sub.plan_price.promo_label if sub.plan_price else None,
            mp_payment_id=sub.mp_payment_id,
            created_at=sub.created_at,
            user_id=sub.user_id,
            user_email=sub.user.email,
            user_public_name=sub.user.public_name,
        )
        for sub in subscriptions
    ]


@router.patch("/subscriptions/{subscription_id}/activate", response_model=AdminSubscriptionRead)
async def patch_admin_subscription_activate(
    subscription_id: UUID,
    payload: SubscriptionActivateRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AdminSubscriptionRead:
    try:
        subscription = activate_subscription_manually(
            session,
            subscription_id=subscription_id,
            expires_at=payload.expires_at,
            admin_id=current_user.id,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return AdminSubscriptionRead(
        id=subscription.id,
        plan_id=subscription.plan_id,
        plan_name=subscription.plan.name,
        plan_type=subscription.plan.plan_type,
        status=subscription.status,
        starts_at=subscription.starts_at,
        expires_at=subscription.expires_at,
        amount_paid=subscription.amount_paid,
        currency=subscription.currency,
        promo_label=subscription.plan_price.promo_label if subscription.plan_price else None,
        mp_payment_id=subscription.mp_payment_id,
        created_at=subscription.created_at,
        user_id=subscription.user_id,
        user_email=subscription.user.email,
        user_public_name=subscription.user.public_name,
    )


@router.post("/subscriptions/expire")
async def post_admin_subscriptions_expire(session: Session = Depends(get_session)) -> dict[str, int]:
    expired = expire_subscriptions(session)
    return {"expired_count": len(expired)}


@router.get("/reports", response_model=list[AdminReportRead])
@limiter.limit("60/minute")
async def get_admin_reports(
    request: Request,
    status_filter: str | None = Query(default=None, alias="status"),
    event_id: UUID | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[AdminReportRead]:
    rows = list_admin_reports(
        session, status=status_filter, event_id=event_id, date_from=date_from, date_to=date_to
    )
    return [
        AdminReportRead(**report.model_dump(), event_title=event_title) for report, event_title in rows
    ]


@router.patch("/reports/{report_id}/status", response_model=AdminReportRead)
async def patch_admin_report_status(
    report_id: UUID,
    payload: ReportStatusUpdate,
    session: Session = Depends(get_session),
) -> AdminReportRead:
    try:
        report = update_report_status(session, report_id, payload.status)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    event = session.get(Event, report.event_id)
    return AdminReportRead(**report.model_dump(), event_title=event.title if event else "")
