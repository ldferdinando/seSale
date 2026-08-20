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

## Rutas protegidas (Etapa 9e)

`middleware.ts` redirige a `/login?redirect={ruta}` cuando falta la
cookie `has_session` (no-HttpOnly, se setea/borra junto con
`refresh_token` en cada login/logout — ver `ARCHITECTURE.md` § 7):
`/publicar`, `/mis-eventos`, `/mi-cuenta`, `/planes`, `/admin` y
`/eventos/{id}/editar`. Después de un login exitoso se vuelve a esa
misma ruta. Esto es solo una capa de UX (evita que alguien complete un
formulario entero para recién enterarse al final que necesita cuenta) —
el backend sigue siendo la única autoridad real, rechazando con `401`
cualquier request sin un JWT válido, tenga o no esa cookie.

`/admin` además verifica en el cliente (`app/admin/layout.tsx`) que
`role === "admin"` — eso no se puede resolver en el middleware (el rol
viaja en el JWT, que el edge runtime no puede validar).

## Variables de entorno por entorno

La app corre en tres entornos: **local** (tu máquina, SQLite/Postgres +
`seed.py`), **staging** (Railway + Vercel, rama `develop`) y
**producción** (Railway + Vercel, rama `main`). Solo hay un
[`.env.example`](./.env.example) en la raíz — las variables de staging y
producción se cargan directamente en Railway/Vercel, **nunca** en
archivos `.env.staging`/`.env.production` del repo.

### Backend (`apps/api`)

| Variable | Local | Staging | Producción |
|---|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg://sesale:sesale@localhost:5432/sesale` (Docker Compose) | Postgres de Railway/Supabase de staging | Postgres de Railway/Supabase de producción — **nunca** la misma DB que staging |
| `SECRET_KEY` | cualquier string | aleatorio y seguro (`python -c "import secrets; print(secrets.token_hex(32))"`) | aleatorio y seguro, **distinto** al de staging |
| `ENVIRONMENT` | `development` | `staging` | `production` |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | `https://<preview-de-staging>.vercel.app` | `https://sesale.com.ar` |
| `DISABLE_SETUP_ENDPOINT` | `false` | `false` hasta crear el admin de staging → `true` después | `false` hasta crear el admin de producción → `true` después |
| `MERCADOPAGO_ACCESS_TOKEN` | `TEST-...` (sandbox) | `TEST-...` (sandbox) | `APP_USR-...` (producción real) |
| `MERCADOPAGO_WEBHOOK_SECRET` | del panel de MP (credenciales test) | del panel de MP (credenciales test) | del panel de MP (credenciales de producción) |
| `RESEND_API_KEY` | cuenta de prueba | cuenta real | cuenta real |
| `ADMIN_EMAIL` | tu email | tu email | tu email |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | vacíos (cae a `apps/api/uploads/`) | proyecto Supabase de staging | proyecto Supabase de producción — **nunca** el mismo que staging |
| `SUPABASE_*_BUCKET` | valores por defecto del `.env.example` | idem, o buckets propios de staging | idem, o buckets propios de producción |

### Frontend (`apps/web`)

| Variable | Local | Staging | Producción |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | URL pública del backend de staging en Railway | URL pública del backend de producción en Railway |
| `NEXT_PUBLIC_MAINTENANCE_MODE` | `false` | `true` hasta el lanzamiento público | `false` desde el lanzamiento |
| `NEXT_PUBLIC_LAUNCH_DATE` | vacío | fecha estimada de lanzamiento (opcional) | vacío una vez lanzado |
| `NEXT_PUBLIC_SESALE_WHATSAPP` | número de prueba | número real | número real |
| `NEXT_PUBLIC_BANK_INFO` | datos de prueba | datos bancarios reales | datos bancarios reales |

> Detalle completo de cada variable, con comentarios de cómo generarla u
> obtenerla, en [`.env.example`](./.env.example).

## Guía de deploy

### Backend en Railway

**Primera vez (staging o producción — repetir con un proyecto Railway
separado para cada uno):**

1. Crear cuenta en [railway.app](https://railway.app).
2. **New Project → Deploy from GitHub repo** → elegir el repo de seSALE
   y la rama correspondiente (`develop` para staging, `main` para
   producción) → configurar:
   - Root directory: `apps/api`
   - Build command: `uv sync`
   - Start command: `uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT`
     (correr las migraciones antes de levantar el server en cada deploy)
3. **New → Database → Add PostgreSQL** (o saltear esto y usar Supabase
   como DB — ver más abajo). Railway conecta la DB automáticamente y
   agrega `DATABASE_URL`.
4. Cargar el resto de las variables de entorno del servicio (pestaña
   **Variables**) según la tabla de arriba.
5. La primera vez, correr las migraciones a mano desde **Railway → tu
   servicio → Shell**: `uv run alembic upgrade head` — ya incluye los
   datos base (ciudades, slots de banners, planes).
6. Crear el primer admin de ese entorno:

   ```bash
   curl -X POST https://<tu-url>.railway.app/api/setup/admin \
     -H "Content-Type: application/json" \
     -d '{"email":"tu@email.com","password":"...","full_name":"...","public_name":"..."}'
   ```

7. Verificar que devuelve `201`, y que un segundo intento devuelve `410
   Gone`. Setear `DISABLE_SETUP_ENDPOINT=true` en Railway.

**Deploys siguientes:** automáticos en cada push a la rama configurada —
las migraciones corren solas (van encadenadas en el Start command).

### Frontend en Vercel

**Primera vez:**

1. Crear cuenta en [vercel.com](https://vercel.com) con GitHub.
2. **New Project → Import** el repo de seSALE → configurar:
   - Framework Preset: Next.js
   - Root Directory: `apps/web`
   - Build Command: `npm run build`
   - Output Directory: `.next` (default)
3. Cargar las variables de entorno en **Settings → Environment
   Variables**, eligiendo el entorno de Vercel para cada una
   (Production / Preview / Development — ver tabla de abajo).
4. Deploy → Vercel genera una URL automática (`sesale.vercel.app`).
5. Dominio propio (opcional): **Settings → Domains → Add Domain** →
   cargar los registros DNS que indica Vercel en el panel del registrar
   del dominio → esperar propagación (5 min a 48hs) → HTTPS se activa
   solo.

**Entornos en Vercel** (automáticos, no hace falta crearlos):

| Entorno de Vercel | Cuándo se usa | Corresponde a |
|---|---|---|
| **Production** | merges a `main` | producción (dominio real) |
| **Preview** | cada PR y push a `develop` | staging (URL única tipo `sesale-git-develop-xxx.vercel.app`) |
| **Development** | `npm run dev` local | local |

### Base de datos en Supabase (opcional, recomendado)

En vez de la Postgres autogenerada por Railway, se puede usar Supabase
(útil porque ya hace falta un proyecto Supabase para el Storage de
flyers/banners/portadas):

1. Crear cuenta en [supabase.com](https://supabase.com).
2. **New Project** → región recomendada: South America (São Paulo), por
   latencia desde la Patagonia.
3. **Settings → Database → Connection string → Mode: URI** → copiar la
   URL (recordá el driver `+psycopg`, no `+asyncpg`).
4. En Railway, reemplazar la `DATABASE_URL` autogenerada por esa.
5. **Table Editor** de Supabase sirve como interfaz visual de la DB —
   no hace falta instalar ningún cliente aparte.
6. Crear **dos proyectos Supabase separados** (staging y producción) —
   nunca compartir la misma DB ni el mismo Storage entre ambos.

### Staging vs producción en Railway

**Dos proyectos Railway separados** (recomendado, más simple que la
feature de Environments en beta de Railway):

- Proyecto **"seSALE Staging"** → conectado a la rama `develop`, con su
  propia DB de Supabase y sus propias variables.
- Proyecto **"seSALE Producción"** → conectado a la rama `main`, DB y
  variables propias.

Flujo de trabajo:

1. Trabajar en `feature/*` o `develop`.
2. Push a `develop` → deploy automático en staging (Railway + Vercel
   Preview).
3. Probar en staging.
4. PR de `develop` a `main` → corre el CI (`ci-backend.yml`/
   `ci-frontend.yml`).
5. Merge a `main` → deploy automático en producción.

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
