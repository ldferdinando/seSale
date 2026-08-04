from fastapi import APIRouter, Depends, Request
from sqlmodel import Session

from app.core.deps import get_session
from app.core.limiter import limiter
from app.schemas.stats import StatsRead
from app.services.event_service import get_public_stats

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("", response_model=StatsRead)
@limiter.limit("60/minute")
async def get_stats(
    request: Request,
    session: Session = Depends(get_session),
) -> StatsRead:
    return StatsRead(**get_public_stats(session))
