# seSALE

Agenda cultural multi-ciudad para el Alto Valle de la Patagonia (Argentina).

Ver [`AGENTS.md`](./AGENTS.md) y [`ARCHITECTURE.md`](./ARCHITECTURE.md) para el contrato técnico
completo (stack, estructura de carpetas, modelo de datos, convenciones y etapas de desarrollo).

## Cómo correr el proyecto localmente (Etapa 1)

### 1. Variables de entorno

```bash
cp .env.example .env
# Completar .env con los valores reales (en Etapa 1 los defaults de SQLite ya funcionan)
```

### 2. Backend (FastAPI + SQLite)

El backend se gestiona con [`uv`](https://docs.astral.sh/uv/) en vez de `pip`.

```bash
cd apps/api

# Instala uv si no lo tenés: https://docs.astral.sh/uv/getting-started/installation/

uv sync                        # crea el venv en apps/api/.venv e instala dependencias
uv run alembic upgrade head    # crea las tablas
uv run python seed.py          # carga datos de prueba
uv run uvicorn app.main:app --reload   # http://localhost:8000
                                        # docs: http://localhost:8000/docs
```

### 3. Frontend (Next.js)

```bash
cd apps/web
npm install
npm run dev                    # http://localhost:3000
```

### 4. Tests (siempre antes de commitear)

```bash
cd apps/api && uv run pytest --cov=app --cov-report=term-missing
cd apps/web && npm run test
```
