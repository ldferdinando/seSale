from fastapi import APIRouter, Depends, Request
from sqlmodel import Session

from app.core.config import settings
from app.core.deps import get_session
from app.core.limiter import limiter
from app.schemas.plan import PlanRead
from app.services.payment_service import list_active_plans

router = APIRouter(prefix="/api/plans", tags=["plans"])


@router.get("", response_model=list[PlanRead])
@limiter.limit("60/minute")
async def get_plans(request: Request, session: Session = Depends(get_session)) -> list[PlanRead]:
    mercadopago_available = bool(settings.mercadopago_access_token)
    return [
        PlanRead(
            id=plan.id,
            name=plan.name,
            plan_type=plan.plan_type,
            pricing_type=plan.pricing_type,
            description=plan.description,
            is_active=plan.is_active,
            price=price,
            mercadopago_available=mercadopago_available,
        )
        for plan, price in list_active_plans(session)
    ]
