from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.limiter import limiter
from app.routers import (
    admin,
    ads,
    auth,
    cities,
    events,
    locations,
    plans,
    reports,
    stats,
    subscriptions,
    users,
    webhooks,
)

app = FastAPI(title="seSALE API")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(cities.router)
app.include_router(events.router)
app.include_router(locations.router)
app.include_router(reports.router)
app.include_router(stats.router)
app.include_router(admin.router)
app.include_router(plans.router)
app.include_router(subscriptions.router)
app.include_router(webhooks.router)
app.include_router(ads.router)

# Etapa 8b — sirve los flyers subidos en development sin Supabase configurado
# (ver app/core/storage.py, fallback a disco local). En producción con
# Supabase Storage esto no se usa: flyer_url ya es una URL pública externa.
_UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_UPLOADS_DIR), name="uploads")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
