# AGENTS.md — Guía de contexto para el agente de IA

> **⚠️ LEER ESTE ARCHIVO COMPLETO ANTES DE ESCRIBIR CUALQUIER LÍNEA DE CÓDIGO.**
> Este archivo es el contrato técnico del proyecto. Toda decisión de arquitectura,
> stack y convención está definida aquí. No se cambia sin aprobación explícita.

---

## Índice

1. [Descripción del proyecto](#1-descripción-del-proyecto)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Estructura del repositorio](#3-estructura-del-repositorio)
4. [Convenciones de código](#4-convenciones-de-código)
5. [Testing — obligatorio](#5-testing--obligatorio)
6. [Seguridad](#6-seguridad)
7. [Zonas horarias](#7-zonas-horarias)
8. [Flujo de trabajo con el agente](#8-flujo-de-trabajo-con-el-agente)
9. [Prohibiciones explícitas](#9-prohibiciones-explícitas)
10. [Referencias](#10-referencias)

---

## 1. Descripción del proyecto

**seSALE** es una agenda cultural multi-ciudad para el Alto Valle de la Patagonia (Argentina).
Permite publicar y descubrir eventos (música, teatro, ferias, fiestas, etc.) con un sistema
de planes de visibilidad pagos y espacios publicitarios.

- Los eventos tienen: título, descripción, categoría, fecha, hora, ubicación, tipo de entrada,
  contacto del organizador y flyer opcional
- Los eventos pasan por moderación: `pending → approved / rejected`
- Hay tres niveles de plan por evento: `gratis`, `dest` (Destacado), `pro` (Destacado Plus)
- La monetización viene de planes pagos procesados por **MercadoPago**
- Los usuarios organizadores se verifican con DNI o CUIT (dato privado, solo visible para admin)
- El sistema es multi-ciudad: cada evento, ubicación y banner pertenece a una ciudad
- Ubicación geográfica: **Argentina (Patagonia)** — zona horaria `America/Argentina/Buenos_Aires`
- Idioma de la interfaz: **español**
- Idioma del código (variables, funciones, comentarios técnicos): **inglés**

Para entender la arquitectura completa del sistema y el modelo de datos,
ver [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## 2. Stack tecnológico

> Las versiones son exactas. No actualizar ni cambiar sin aprobación.

### Frontend Web
| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 14.x (App Router) | Framework principal |
| React | 18.x | UI |
| TypeScript | 5.x | Lenguaje |
| Tailwind CSS | 3.x | Estilos |
| Shadcn/UI | latest | Componentes de UI |
| React Hook Form | 7.x | Manejo de formularios |
| Zod | 3.x | Validación de esquemas |
| TanStack Query | 5.x | Fetching y cache de datos |
| date-fns | 3.x | Manejo de fechas |
| date-fns-tz | 3.x | Conversión de zonas horarias en cliente |
| @mercadopago/sdk-react | latest | MercadoPago Bricks (Etapa 6) |

### App Mobile
| Tecnología | Versión | Uso |
|---|---|---|
| Expo | SDK 51 | Framework mobile |
| React Native | 0.74.x | UI nativa |
| TypeScript | 5.x | Lenguaje |
| Expo Router | 3.x | Navegación |
| NativeWind | 4.x | Estilos Tailwind en React Native |

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| Python | 3.12.x | Lenguaje |
| FastAPI | 0.111.x | Framework API |
| SQLModel | 0.0.19 | ORM (combina SQLAlchemy + Pydantic) |
| Alembic | 1.13.x | Migraciones de base de datos |
| Pydantic | 2.x | Validación de datos |
| python-jose | 3.x | JWT tokens |
| passlib | 1.7.x | Hash de contraseñas |
| slowapi | 0.1.x | Rate limiting |
| uvicorn | 0.29.x | Servidor ASGI |
| httpx | 0.27.x | Cliente HTTP async (tests + llamadas a MercadoPago) |
| mercadopago | 2.x | SDK oficial de MercadoPago (Etapa 6) |

### Base de datos y servicios
| Servicio | Etapa | Uso |
|---|---|---|
| SQLite | Etapas 1-2 (histórico) | DB local sin configuración (archivo `.db`) — reemplazada por Postgres en Etapa 3 |
| PostgreSQL 16 | Etapa 3+ | DB de producción y desarrollo avanzado (vía Docker Compose en local) |
| JWT propio (python-jose + passlib/bcrypt) | Etapa 3+ | Autenticación y gestión de usuarios — ver nota abajo |
| Supabase Storage | Etapa 3+ | Archivos e imágenes (flyers de eventos) |
| MercadoPago API | Etapa 6 | Procesamiento de pagos de planes |

> **Nota — Supabase Auth:** se evaluó usarlo en Etapa 3 pero se decidió emitir JWT
> propios (access + refresh) contra la tabla `users` de Postgres, para no atar la
> identidad de usuarios a un proveedor externo todavía. Se reevalúa en Etapa 6 si
> hace falta login social (Google/WhatsApp) o gestión externa de usuarios.

### Infraestructura y DevOps
| Herramienta | Uso |
|---|---|
| Docker + Docker Compose | Desarrollo local (Etapa 3+, cuando se usa Postgres) |
| Vercel | Deploy del frontend web |
| Railway | Deploy del backend y base de datos PostgreSQL |
| GitHub Actions | CI/CD — corre tests antes de cada merge a `main` |

---

## 3. Estructura del repositorio

Este es un **monorepo**. La estructura de carpetas no se modifica sin aprobación.

```
root/
├── apps/
│   ├── web/                        # Next.js 14 (frontend web)
│   │   ├── src/
│   │   │   ├── app/                # App Router de Next.js (páginas y layouts)
│   │   │   ├── components/         # Componentes reutilizables globales
│   │   │   ├── features/           # Módulos por feature (ver convención abajo)
│   │   │   │   ├── events/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── cities/
│   │   │   │   ├── ads/
│   │   │   │   └── admin/          # Panel admin (gestión de destacados — Etapa 5)
│   │   │   ├── lib/                # Utilidades, clientes API, helpers
│   │   │   ├── hooks/              # Custom hooks globales
│   │   │   └── types/              # Tipos TypeScript globales
│   │   ├── public/
│   │   ├── tests/                  # Tests del frontend
│   │   │   ├── unit/
│   │   │   └── integration/
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   │
│   ├── mobile/                     # Expo (React Native)
│   │   ├── app/                    # Expo Router (pantallas)
│   │   ├── components/
│   │   ├── features/
│   │   ├── lib/
│   │   ├── hooks/
│   │   └── types/
│   │
│   └── api/                        # FastAPI (backend)
│       ├── app/
│       │   ├── main.py             # Entry point
│       │   ├── core/               # Config, seguridad, dependencias
│       │   │   ├── config.py
│       │   │   ├── security.py
│       │   │   └── deps.py
│       │   ├── models/             # SQLModel — modelos de base de datos
│       │   │   ├── city.py
│       │   │   ├── user.py
│       │   │   ├── event.py
│       │   │   ├── location.py
│       │   │   ├── subscription.py
│       │   │   └── ad_slot.py
│       │   ├── schemas/            # Pydantic — esquemas de request/response
│       │   ├── routers/            # Endpoints organizados por recurso
│       │   │   ├── admin.py        # Endpoints solo-admin (eventos completos, alta de usuarios) — Etapa 5.6
│       │   │   ├── auth.py
│       │   │   ├── events.py
│       │   │   ├── users.py
│       │   │   ├── cities.py
│       │   │   ├── locations.py
│       │   │   ├── subscriptions.py
│       │   │   ├── ads.py
│       │   │   ├── stats.py
│       │   │   └── webhooks.py
│       │   └── services/           # Lógica de negocio desacoplada
│       │       ├── event_service.py
│       │       ├── user_service.py
│       │       ├── city_service.py
│       │       └── payment_service.py
│       ├── tests/                  # Tests del backend
│       │   ├── unit/
│       │   └── integration/
│       ├── alembic/                # Migraciones de base de datos
│       ├── alembic.ini
│       ├── seed.py                 # Datos de prueba (ciudades, eventos, usuarios demo)
│       └── requirements.txt
│
├── packages/
│   └── shared-types/               # Tipos compartidos entre web y mobile
│       └── src/
│           └── index.ts
│
├── docs/                           # Documentación adicional
│   └── decisions/                  # ADRs: decisiones de arquitectura
│
├── .github/
│   └── workflows/
│       ├── ci-backend.yml
│       └── ci-frontend.yml
│
├── docker-compose.yml              # Postgres para desarrollo local (Etapa 3+) — los tests siguen en SQLite in-memory
├── .env.example                    # Variables de entorno de ejemplo (sin valores reales)
├── .gitignore                      # Incluye .env, *.db, __pycache__, node_modules
├── AGENTS.md                       # Este archivo
├── ARCHITECTURE.md                 # Arquitectura y modelo de datos
└── README.md                       # Setup e instrucciones para desarrolladores
```

### Convención de estructura por feature (frontend)

Cada feature dentro de `features/` sigue esta estructura interna:

```
features/events/
├── components/       # Componentes específicos de este feature
├── hooks/            # Hooks específicos de este feature
├── services/         # Llamadas a la API relacionadas
├── schemas/          # Esquemas Zod de validación
├── types/            # Tipos TypeScript del feature
└── index.ts          # Exportaciones públicas del feature
```

---

## 4. Convenciones de código

### Nomenclatura general

| Elemento | Convención | Ejemplo |
|---|---|---|
| Componentes React | PascalCase | `EventCard.tsx` |
| Hooks | camelCase con prefijo `use` | `useEventList.ts` |
| Funciones y variables | camelCase | `fetchEvents()` |
| Constantes | SCREAMING_SNAKE_CASE | `MAX_ATTENDEES` |
| Archivos de utilidades | kebab-case | `date-helpers.ts` |
| Modelos Python | PascalCase | `class Event` |
| Funciones Python | snake_case | `def get_event_by_id` |
| Tablas de base de datos | snake_case plural | `events`, `ad_slots` |
| Variables de entorno | SCREAMING_SNAKE_CASE | `DATABASE_URL` |

### Reglas de TypeScript (frontend)
- Siempre tipar explícitamente los props de componentes con `interface`
- Nunca usar `any` — usar `unknown` si el tipo es realmente desconocido
- Usar `type` para uniones/intersecciones, `interface` para objetos extensibles
- Los componentes de página van en `app/`, los reutilizables en `components/` o `features/`

### Reglas de Python (backend)
- Usar **type hints** en todas las funciones
- Los schemas de Pydantic siempre tienen validadores explícitos
- La lógica de negocio va en `services/`, no en los routers
- Los routers solo orquestan: reciben request → llaman service → devuelven response
- Usar `async def` en todos los endpoints

### Manejo de errores
- Backend: nunca exponer stack traces en respuestas de producción
- Frontend: siempre manejar estados de error y loading en la UI
- Usar HTTP status codes correctos (no todo 200, no todo 500)

---

## 5. Testing — OBLIGATORIO

> **Una tarea NO está terminada hasta que los tests estén escritos y pasen.**
> No se hace commit de código sin tests. No se reporta una feature como completa sin tests verdes.

### Backend (Python)

**Framework:** `pytest` + `httpx` (cliente async para tests de FastAPI)

```bash
# Correr todos los tests del backend
cd apps/api
pytest

# Con cobertura
pytest --cov=app --cov-report=term-missing

# Cobertura mínima requerida: 80%
```

**Qué testear siempre:**
- Cada endpoint: caso feliz + casos de error (401, 403, 404, 422)
- Cada función de servicio con lógica de negocio
- Validaciones de Pydantic en schemas críticos
- Lógica de autenticación y autorización

**Estructura de un test de endpoint:**
```python
# tests/unit/test_events.py
async def test_create_event_success(client, auth_headers):
    payload = {"title": "...", "date": "...", ...}
    response = await client.post("/api/events", json=payload, headers=auth_headers)
    assert response.status_code == 201
    assert response.json()["title"] == payload["title"]

async def test_create_event_unauthenticated(client):
    response = await client.post("/api/events", json={})
    assert response.status_code == 401
```

### Frontend (TypeScript)

**Framework:** `Vitest` + `React Testing Library` + `MSW` (mock de API)

```bash
# Correr todos los tests del frontend
cd apps/web
npm run test

# En modo watch
npm run test:watch

# Con cobertura
npm run test:coverage
```

**Qué testear siempre:**
- Componentes críticos: renderización con props distintos
- Formularios: validación, submit, manejo de errores
- Hooks custom con lógica de negocio
- Páginas principales: que rendericen los estados clave (loading, error, vacío, con datos)

**Qué NO hace falta testear unitariamente:**
- Componentes puramente visuales sin lógica (un `<Badge>` de Shadcn)
- Estilos de Tailwind

### CI/CD — Los tests corren automáticamente

Antes de cada merge a `main`, el pipeline de GitHub Actions corre los tests.
Si los tests fallan, el merge está bloqueado.

```yaml
# El agente DEBE asegurarse de que localmente pasen antes de reportar tarea completa:
cd apps/api && pytest          # Backend: todos verdes
cd apps/web && npm run test    # Frontend: todos verdes
```

---

## 6. Seguridad

Estas reglas son **no negociables** y aplican desde el primer commit.

### Variables de entorno
- Nunca hardcodear credenciales, URLs de base de datos, secrets o API keys en el código
- Toda configuración sensible va en variables de entorno
- El archivo `.env` está en `.gitignore` — **nunca se commitea**
- El archivo `.env.example` sí se commitea, con las keys pero sin valores reales

### Autenticación y autorización
- Auth propia con JWT (Etapa 3+): `access_token` de corta duración (30 min) +
  `refresh_token` de larga duración (7 días), emitidos con `python-jose` y
  passwords hasheadas con `passlib`/`bcrypt`
- El `refresh_token` viaja como cookie `httpOnly` (nunca accesible por JS); el
  `access_token` vive solo en memoria en el frontend
- Una sola sesión activa por usuario: el login pisa el `refresh_token_hash`
  anterior en `users`, el logout lo borra; cada `/api/auth/refresh` rota el token
- Usar roles: `admin` y `user` como mínimo
- Todos los endpoints que modifican datos requieren autenticación

### API y transporte
- HTTPS siempre en producción (Vercel y Railway lo proveen automáticamente)
- CORS configurado explícitamente — solo los orígenes permitidos
- Rate limiting activo en todos los endpoints públicos (`slowapi`)
- Inputs validados con Pydantic en el backend y Zod en el frontend

### Base de datos
- El backend nunca construye queries con f-strings — usar el ORM siempre
- Principio de mínimo privilegio: el usuario de DB tiene solo los permisos necesarios

### Datos sensibles de usuarios
- Los campos `doc_number` (DNI/CUIT) y `phone` se tratan como datos privados
- Nunca devolverlos en responses públicas ni en listados de eventos
- Solo el rol `admin` puede ver estos campos a través de endpoints específicos

### MercadoPago (Etapa 6)
- Siempre verificar la firma (`x-signature`) de los webhooks entrantes
- Nunca procesar un pago sin confirmar con la API de MP que el estado es `approved`
- El `ACCESS_TOKEN` de MP va solo en variables de entorno del backend, nunca en el frontend
- En el frontend solo se usa la `PUBLIC_KEY` de MP (es de solo lectura, es seguro)

---

## 7. Zonas horarias

Argentina usa `America/Argentina/Buenos_Aires` (UTC-3, sin cambio de horario estacional).

**Regla absoluta:**
- La base de datos almacena fechas y horas **siempre en UTC** con tipo `TIMESTAMP WITH TIME ZONE`
- El backend recibe y devuelve fechas en formato **ISO 8601 con timezone** (`2024-03-15T20:00:00-03:00`)
- El frontend convierte al timezone del usuario para mostrar, usando `date-fns-tz`
- Nunca almacenar fechas como strings sin timezone

```python
# ✓ Correcto en Python
from datetime import datetime, timezone
now = datetime.now(timezone.utc)

# ✗ Incorrecto
now = datetime.now()  # sin timezone → bug silencioso
```

---

## 8. Flujo de trabajo con el agente

### Cómo pedir una tarea correctamente

Usar siempre esta estructura:

```
"Siguiendo AGENTS.md y ARCHITECTURE.md, [acción concreta]
en [ruta exacta del archivo o carpeta].
Debe [comportamiento esperado con detalle].
Los campos/datos involucrados son [lista].
Tené en cuenta que [restricciones o contexto adicional]."
```

### Antes de codear — el agente declara su plan

Antes de escribir código, el agente debe listar:
1. Qué archivos va a crear
2. Qué archivos va a modificar
3. Qué archivos NO va a tocar
4. Qué tests va a escribir

Si el plan toca archivos que no corresponden, detenerlo y corregir antes de continuar.

### Al finalizar una tarea, el agente debe confirmar

```
✓ Archivos creados: [lista]
✓ Archivos modificados: [lista]
✓ Tests escritos: [lista de archivos de test]
✓ Tests ejecutados: pytest / npm run test → TODOS VERDES
✓ Ninguna variable de entorno hardcodeada
✓ Sin dependencias nuevas no aprobadas
```

---

## 9. Prohibiciones explícitas

El agente **nunca debe**:

- ❌ Cambiar la estructura de carpetas del repositorio
- ❌ Instalar dependencias nuevas sin listarlas primero y recibir aprobación
- ❌ Modificar migraciones de Alembic ya aplicadas (crear una nueva en su lugar)
- ❌ Hardcodear credenciales, secrets o URLs de servicios
- ❌ Usar `any` en TypeScript
- ❌ Escribir queries SQL con concatenación de strings
- ❌ Dejar un endpoint sin autenticación si maneja datos de usuarios
- ❌ Reportar una tarea como completa si los tests no pasan
- ❌ Crear archivos fuera de la estructura definida sin justificación explícita
- ❌ Cambiar versiones del stack sin aprobación
- ❌ Devolver campos privados del usuario (doc_number, phone, full_name) en responses públicas
- ❌ Procesar un webhook de MercadoPago sin verificar su firma primero
- ❌ Usar el ACCESS_TOKEN de MercadoPago en el frontend

---

## 10. Referencias

| Documento | Contenido |
|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Diagrama del sistema, modelo de datos, flujos principales, etapas |
| [`README.md`](./README.md) | Setup local, cómo correr el proyecto, primeros pasos |
| [`.env.example`](./.env.example) | Variables de entorno requeridas |
| [`docs/decisions/`](./docs/decisions/) | Registro de decisiones de arquitectura (ADRs) |
