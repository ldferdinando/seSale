from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from app.core.deps import get_current_user, get_session, require_admin
from app.core.email import send_subscription_approved_email, send_subscription_rejected_email
from app.core.expiry import expire_overdue_subscriptions
from app.core.limiter import limiter
from app.core.storage import InvalidFlyerFileError
from app.models.event import Event, EventStatus
from app.models.plan import PlanType
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.user import User
from app.schemas.ad_slot import (
    AdItemAdminRead,
    AdItemCreate,
    AdItemReorderRequest,
    AdItemStatusUpdate,
    AdItemUpdate,
    AdSection,
    AdSlotAdminRead,
)
from app.schemas.city import CityAdminRead, CitySortOrderUpdate
from app.schemas.event import AdminEventRead, EventRead
from app.schemas.location import (
    LocationAdminCreate,
    LocationAdminRead,
    LocationAdminUpdate,
    LocationGastroAdminRead,
    LocationGastroCreate,
    LocationGastroPlanUpdate,
    LocationGastroUpdate,
    LocationGastroVerifyUpdate,
    LocationVerifyUpdate,
)
from app.schemas.report import AdminReportRead, ReportStatusUpdate
from app.schemas.subscription import (
    AdminSubscriptionRead,
    OrganizerSubscriptionRead,
    SubscriptionActivateRequest,
    SubscriptionReviewRequest,
)
from app.schemas.user import AdminUserCreate, UserAdminRead, UserRead
from app.services.ad_service import (
    create_ad_item,
    delete_ad_item,
    list_admin_ad_items,
    list_admin_ad_slots,
    reorder_ad_items,
    toggle_ad_item_status,
    update_ad_item,
    upload_ad_item_image,
)
from app.services.city_service import (
    count_active_future_events,
    list_all_cities_with_active_event_counts,
    update_city_sort_order,
)
from app.services.event_service import list_admin_events
from app.services.location_service import (
    create_admin_location,
    create_gastro_place,
    delete_admin_location,
    delete_gastro_cover,
    delete_gastro_place,
    list_admin_gastro_places,
    list_admin_locations,
    set_gastro_plan,
    update_admin_location,
    update_gastro_place,
    upload_gastro_cover,
    verify_gastro_place,
    verify_location,
)
from app.services.payment_service import (
    activate_subscription_manually,
    get_latest_subscriptions_by_event,
    review_subscription,
)
from app.services.report_service import list_admin_reports, update_report_status
from app.services.user_service import create_user_by_admin, list_users_admin

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _to_admin_subscription_read(sub: Subscription) -> AdminSubscriptionRead:
    return AdminSubscriptionRead(
        id=sub.id,
        plan_id=sub.plan_id,
        plan_name=sub.plan.name,
        plan_type=sub.plan.plan_type,
        status=sub.status,
        payment_method=sub.payment_method,
        starts_at=sub.starts_at,
        expires_at=sub.expires_at,
        amount_paid=sub.amount_paid,
        currency=sub.currency,
        promo_label=sub.plan_price.promo_label if sub.plan_price else None,
        mp_payment_id=sub.mp_payment_id,
        transfer_note=sub.transfer_note,
        reviewed_at=sub.reviewed_at,
        created_at=sub.created_at,
        event_id=sub.event_id,
        event_title=sub.event.title if sub.event else None,
        user_id=sub.user_id,
        user_email=sub.user.email,
        user_public_name=sub.user.public_name,
    )


def _to_organizer_subscription_read(subscription: Subscription | None) -> OrganizerSubscriptionRead | None:
    if subscription is None:
        return None
    return OrganizerSubscriptionRead(
        status=subscription.status,
        payment_method=subscription.payment_method,
        plan_name=subscription.plan.name,
        plan_type=subscription.plan.plan_type,
        transfer_note=subscription.transfer_note,
        created_at=subscription.created_at,
        reviewed_at=subscription.reviewed_at,
    )


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
    organizer_id: UUID | None = Query(default=None),
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
        organizer_id=organizer_id,
        limit=limit,
        offset=offset,
    )
    latest_subscriptions = get_latest_subscriptions_by_event(session, [event.id for event in events])
    return [
        AdminEventRead(
            **EventRead.model_validate(event).model_dump(),
            organizer_public_name=event.organizer.public_name,
            is_active=event.is_active,
            organizer_subscription=_to_organizer_subscription_read(latest_subscriptions.get(event.id)),
        )
        for event in events
    ]


@router.get("/users", response_model=list[UserAdminRead])
async def get_admin_users(
    search: str | None = Query(default=None),
    role: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    city_id: UUID | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[UserAdminRead]:
    """Etapa 9b — listado completo de usuarios para el panel admin, sin
    excepción de rol ni de is_active (a diferencia de GET /api/users, que
    devuelve UserRead sin los campos calculados city_name/event_count).
    Sin paginación a propósito — ver a_revisar.md."""
    return list_users_admin(session, search=search, role=role, is_active=is_active, city_id=city_id)


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
            is_verified=payload.is_verified,
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
        selectinload(Subscription.event),
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
    # pending_approval primero (avisos de transferencia esperando revisión), luego el resto
    subscriptions = sorted(
        subscriptions, key=lambda sub: sub.status != SubscriptionStatus.pending_approval
    )
    return [_to_admin_subscription_read(sub) for sub in subscriptions]


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

    return _to_admin_subscription_read(subscription)


@router.patch("/subscriptions/{subscription_id}/review", response_model=AdminSubscriptionRead)
async def patch_admin_subscription_review(
    subscription_id: UUID,
    payload: SubscriptionReviewRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AdminSubscriptionRead:
    try:
        subscription = review_subscription(
            session,
            subscription_id=subscription_id,
            admin_id=current_user.id,
            action=payload.action,
            admin_notes=payload.admin_notes,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    if payload.action == "approve":
        await send_subscription_approved_email(
            user_email=subscription.user.email,
            user_public_name=subscription.user.public_name,
            plan_name=subscription.plan.name,
            expires_at=subscription.expires_at,
        )
    else:
        await send_subscription_rejected_email(
            user_email=subscription.user.email,
            user_public_name=subscription.user.public_name,
            plan_name=subscription.plan.name,
            admin_notes=payload.admin_notes,
        )

    return _to_admin_subscription_read(subscription)


@router.post("/subscriptions/expire")
async def post_admin_subscriptions_expire(session: Session = Depends(get_session)) -> dict[str, int]:
    expired = expire_overdue_subscriptions(session)
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


@router.get("/locations", response_model=list[LocationAdminRead])
@limiter.limit("60/minute")
async def get_admin_locations(
    request: Request,
    city_id: UUID | None = Query(default=None),
    is_public: bool | None = Query(default=None),
    is_verified: bool | None = Query(default=None),
    place_type: str | None = Query(default=None),
    search: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
) -> list[LocationAdminRead]:
    return list_admin_locations(
        session,
        city_id=city_id,
        is_public=is_public,
        is_verified=is_verified,
        place_type=place_type,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.post("/locations", response_model=LocationAdminRead, status_code=status.HTTP_201_CREATED)
async def post_admin_location(
    payload: LocationAdminCreate,
    session: Session = Depends(get_session),
) -> LocationAdminRead:
    try:
        return create_admin_location(session, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.put("/locations/{location_id}", response_model=LocationAdminRead)
async def put_admin_location(
    location_id: UUID,
    payload: LocationAdminUpdate,
    session: Session = Depends(get_session),
) -> LocationAdminRead:
    try:
        return update_admin_location(session, location_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/locations/{location_id}/verify", response_model=LocationAdminRead)
async def patch_admin_location_verify(
    location_id: UUID,
    payload: LocationVerifyUpdate,
    session: Session = Depends(get_session),
) -> LocationAdminRead:
    try:
        return verify_location(session, location_id, payload.is_verified)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/locations/{location_id}")
async def delete_admin_location_endpoint(
    location_id: UUID,
    session: Session = Depends(get_session),
) -> dict[str, str]:
    try:
        delete_admin_location(session, location_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return {"detail": "Lugar eliminado"}


@router.get("/cities", response_model=list[CityAdminRead])
async def get_admin_cities(session: Session = Depends(get_session)) -> list[CityAdminRead]:
    """Etapa 8a — todas las ciudades (activas e inactivas), con la cantidad
    de eventos activos como contexto antes de deshabilitar. Usado por el
    panel admin de Ciudades (GET /api/cities público solo devuelve activas)."""
    return [
        CityAdminRead(**city.model_dump(), active_events_count=count)
        for city, count in list_all_cities_with_active_event_counts(session)
    ]


@router.patch("/cities/{city_id}/sort-order", response_model=CityAdminRead)
async def patch_admin_city_sort_order(
    city_id: UUID,
    payload: CitySortOrderUpdate,
    session: Session = Depends(get_session),
) -> CityAdminRead:
    try:
        city = update_city_sort_order(session, city_id, payload.sort_order)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    count = count_active_future_events(session, city.id)
    return CityAdminRead(**city.model_dump(), active_events_count=count)


# ── Etapa 8d — banners (ad-slots / ad-items) ──────────────────────────────


@router.get("/ad-slots", response_model=list[AdSlotAdminRead])
async def get_admin_ad_slots(
    city_id: UUID = Query(...),
    section: AdSection | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[AdSlotAdminRead]:
    return list_admin_ad_slots(session, city_id=city_id, section=section)


@router.get("/ad-items", response_model=list[AdItemAdminRead])
async def get_admin_ad_items(
    city_id: UUID | None = Query(default=None),
    section: AdSection | None = Query(default=None),
    status: str | None = Query(default=None),
    user_id: UUID | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[AdItemAdminRead]:
    return list_admin_ad_items(
        session,
        city_id=city_id,
        section=section,
        status=status,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
    )


@router.post("/ad-items", response_model=AdItemAdminRead, status_code=status.HTTP_201_CREATED)
async def post_admin_ad_item(
    payload: AdItemCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AdItemAdminRead:
    try:
        return create_ad_item(session, payload, created_by=current_user.id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.put("/ad-items/{ad_item_id}", response_model=AdItemAdminRead)
async def put_admin_ad_item(
    ad_item_id: UUID,
    payload: AdItemUpdate,
    session: Session = Depends(get_session),
) -> AdItemAdminRead:
    try:
        return update_ad_item(session, ad_item_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/ad-items/{ad_item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_ad_item(
    ad_item_id: UUID,
    session: Session = Depends(get_session),
) -> None:
    try:
        delete_ad_item(session, ad_item_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/ad-items/{ad_item_id}/status", response_model=AdItemAdminRead)
async def patch_admin_ad_item_status(
    ad_item_id: UUID,
    payload: AdItemStatusUpdate,
    session: Session = Depends(get_session),
) -> AdItemAdminRead:
    try:
        return toggle_ad_item_status(session, ad_item_id, payload.status)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/ad-items/{ad_item_id}/image", response_model=AdItemAdminRead)
async def post_admin_ad_item_image(
    ad_item_id: UUID,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
) -> AdItemAdminRead:
    content = await file.read()
    try:
        return await upload_ad_item_image(
            session,
            ad_item_id,
            file_content=content,
            filename=file.filename or "banner",
            content_type=file.content_type or "application/octet-stream",
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except InvalidFlyerFileError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.patch("/ad-items/reorder", response_model=list[AdItemAdminRead])
async def patch_admin_ad_items_reorder(
    payload: AdItemReorderRequest,
    session: Session = Depends(get_session),
) -> list[AdItemAdminRead]:
    try:
        return reorder_ad_items(session, payload.slot_id, payload.ordered_ids)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


# ── Etapa 8e — Gastronomía ────────────────────────────────────────────────


@router.get("/gastro", response_model=list[LocationGastroAdminRead])
@limiter.limit("60/minute")
async def get_admin_gastro_places(
    request: Request,
    city_id: UUID | None = Query(default=None),
    gastro_type: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    is_public: bool | None = Query(default=None),
    is_verified: bool | None = Query(default=None),
    plan: str | None = Query(default=None),
    search: str | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[LocationGastroAdminRead]:
    return list_admin_gastro_places(
        session,
        city_id=city_id,
        gastro_type=gastro_type,
        is_active=is_active,
        is_public=is_public,
        is_verified=is_verified,
        plan=plan,
        search=search,
    )


@router.post("/gastro", response_model=LocationGastroAdminRead, status_code=status.HTTP_201_CREATED)
async def post_admin_gastro_place(
    payload: LocationGastroCreate,
    session: Session = Depends(get_session),
) -> LocationGastroAdminRead:
    try:
        return create_gastro_place(session, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.put("/gastro/{location_id}", response_model=LocationGastroAdminRead)
async def put_admin_gastro_place(
    location_id: UUID,
    payload: LocationGastroUpdate,
    session: Session = Depends(get_session),
) -> LocationGastroAdminRead:
    try:
        return update_gastro_place(session, location_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/gastro/{location_id}")
async def delete_admin_gastro_place(
    location_id: UUID,
    session: Session = Depends(get_session),
) -> dict[str, str]:
    try:
        delete_gastro_place(session, location_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return {"detail": "Lugar gastronómico eliminado"}


@router.patch("/gastro/{location_id}/verify", response_model=LocationGastroAdminRead)
async def patch_admin_gastro_verify(
    location_id: UUID,
    payload: LocationGastroVerifyUpdate,
    session: Session = Depends(get_session),
) -> LocationGastroAdminRead:
    try:
        return verify_gastro_place(session, location_id, payload.is_verified)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/gastro/{location_id}/plan", response_model=LocationGastroAdminRead)
async def patch_admin_gastro_plan(
    location_id: UUID,
    payload: LocationGastroPlanUpdate,
    session: Session = Depends(get_session),
) -> LocationGastroAdminRead:
    try:
        return set_gastro_plan(session, location_id, payload.plan)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/gastro/{location_id}/cover")
async def post_admin_gastro_cover(
    location_id: UUID,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
) -> dict[str, str | None]:
    content = await file.read()
    try:
        cover_img_url = await upload_gastro_cover(
            session,
            location_id,
            file_content=content,
            filename=file.filename or "cover",
            content_type=file.content_type or "application/octet-stream",
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except InvalidFlyerFileError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return {"cover_img_url": cover_img_url}


@router.delete("/gastro/{location_id}/cover")
async def delete_admin_gastro_cover(
    location_id: UUID,
    session: Session = Depends(get_session),
) -> dict[str, str | None]:
    try:
        delete_gastro_cover(session, location_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"cover_img_url": None}
