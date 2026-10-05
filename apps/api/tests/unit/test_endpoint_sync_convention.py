"""AGENTS.md §4 — los endpoints con I/O bloqueante (Session síncrona de
SQLModel, SDKs sin soporte async) son `def` para que FastAPI los corra en el
threadpool en vez de bloquear el event loop. Solo pueden ser `async def`
los que no hacen I/O bloqueante o los casos mixtos que envuelven la parte
síncrona con `run_in_threadpool` (listados acá abajo a propósito).
"""
import inspect

from fastapi.routing import APIRoute

from app.main import app

# path → motivo por el que puede ser `async def`
_ASYNC_ALLOWED = {
    "/health": "sin I/O",
    "/api/health": "sin I/O",
    "/api/webhooks/mercadopago": "caso mixto: await request.json() + run_in_threadpool",
}


def _unwrap(func):
    # slowapi envuelve el endpoint con functools.wraps
    while hasattr(func, "__wrapped__"):
        func = func.__wrapped__
    return func


def test_only_allowed_endpoints_are_async() -> None:
    async_paths = {
        route.path
        for route in app.routes
        if isinstance(route, APIRoute) and inspect.iscoroutinefunction(_unwrap(route.endpoint))
    }
    assert async_paths == set(_ASYNC_ALLOWED)
