# seSALE

Agenda cultural multi-ciudad para el Alto Valle de la Patagonia (Argentina).

Ver [`AGENTS.md`](./AGENTS.md) y [`ARCHITECTURE.md`](./ARCHITECTURE.md) para el contrato técnico
completo (stack, estructura de carpetas, modelo de datos, convenciones y etapas de desarrollo).

## Cómo correr el proyecto localmente (Etapa 3+)

### 1. Variables de entorno

```bash
cp .env.example .env
# Completar .env con los valores reales — al menos SECRET_KEY para firmar los JWT
```

### 2. Base de datos (PostgreSQL vía Docker Compose)

```bash
docker compose up -d db        # levanta Postgres 16 en localhost:5432
```

### 3. Backend (FastAPI + PostgreSQL)

El backend se gestiona con [`uv`](https://docs.astral.sh/uv/) en vez de `pip`.

```bash
cd apps/api

# Instala uv si no lo tenés: https://docs.astral.sh/uv/getting-started/installation/

uv sync --all-extras           # crea el venv en apps/api/.venv e instala dependencias
uv run alembic upgrade head    # crea las tablas — incluye los datos base (ciudades,
                                # slots de banners, planes), ver nota abajo
uv run python seed.py          # datos de PRUEBA adicionales (solo desarrollo local)
uv run uvicorn app.main:app --reload   # http://localhost:8000
                                        # docs: http://localhost:8000/docs
```

> **Nota — migraciones y datos base (Etapa 9d):** `alembic upgrade head`
> ya incluye los datos base mínimos que la app necesita para funcionar
> (las 6 ciudades, los slots de banners vacíos de las ciudades activas y
> los 4 planes de visibilidad). **No hace falta correr `seed.py` en
> producción** — ahí solo corren las migraciones. `seed.py` sigue
> existiendo para cargar datos de prueba adicionales (eventos, usuarios
> demo) en desarrollo local.

### 4. Frontend (Next.js)

```bash
cd apps/web
npm install
npm run dev                    # http://localhost:3000
```

### 5. Tests (siempre antes de commitear)

Los tests del backend usan SQLite in-memory — no necesitan Docker ni Postgres.

```bash
cd apps/api && uv run pytest --cov=app --cov-report=term-missing
cd apps/web && npm run test
```

## Setup inicial en producción

Una vez deployado el backend por primera vez:

1. Verificar que el backend está corriendo:

   ```bash
   curl https://tu-api.railway.app/api/health
   ```

2. Crear el primer admin (solo funciona una vez — el endpoint se
   auto-desactiva apenas existe un admin):

   ```bash
   curl -X POST https://tu-api.railway.app/api/setup/admin \
     -H "Content-Type: application/json" \
     -d '{
       "email": "tu@email.com",
       "password": "password-seguro-de-12-chars",
       "full_name": "Tu Nombre Real",
       "public_name": "seSALE Admin"
     }'
   ```

3. Verificar que devuelve `201` con los datos del admin creado.

4. Intentar de nuevo → debe devolver `410 Gone`.

5. En Railway, setear `DISABLE_SETUP_ENDPOINT=true` en las variables de
   entorno del servicio (capa extra de seguridad además del guard
   automático del punto anterior).

## Modo mantenimiento

La app se puede deployar antes de estar lista para el público: mientras
`NEXT_PUBLIC_MAINTENANCE_MODE=true` (Vercel), todo el sitio salvo
`/login`, `/api/*` y los assets de Next.js se muestra como `/proximamente`
("Próximamente"). El admin sigue pudiendo entrar por `/login` con
normalidad.

- **Activar:** setear `NEXT_PUBLIC_MAINTENANCE_MODE=true` en las
  variables de entorno del proyecto en Vercel y redeployar.
- **Desactivar (lanzamiento público):** setear la variable en `false` (o
  eliminarla) y redeployar.
- **Countdown opcional:** si `NEXT_PUBLIC_LAUNCH_DATE` tiene una fecha
  ISO (ej. `2025-06-01T00:00:00-03:00`), `/proximamente` muestra una
  cuenta regresiva hasta esa fecha. Vacía = sin countdown.

El filtro corre en el middleware de Next.js (edge runtime) — es solo una
capa de UX, no de seguridad: el backend sigue protegiendo cada endpoint
con su propia autenticación (JWT) sin importar el modo mantenimiento.

## Configurar branch protection en GitHub

1. Ir a GitHub → Settings → Branches
2. Add branch protection rule → Branch name: `main`
3. Activar:
   - ✓ Require a pull request before merging
     - Required approvals: 1
   - ✓ Require status checks to pass before merging
     - Agregar: "Backend CI / test"
     - Agregar: "Frontend CI / test"
   - ✓ Require branches to be up to date before merging
   - ✓ Do not allow bypassing the above settings
4. Save changes
