# ARCHITECTURE.md — Arquitectura del sistema

> Documento complementario a [`AGENTS.md`](./AGENTS.md).
> El agente debe leer ambos antes de escribir código.
>
> **Última actualización:** modelo de datos derivado del prototipo HTML de seSALE.
> Incluye sistema de planes, multi-ciudad, verificación de identidad e integración MercadoPago.

---

## Índice

1. [Visión general del sistema](#1-visión-general-del-sistema)
2. [Componentes y responsabilidades](#2-componentes-y-responsabilidades)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Flujos principales](#4-flujos-principales)
5. [API — Endpoints planificados](#5-api--endpoints-planificados)
6. [Etapas de desarrollo](#6-etapas-de-desarrollo)
7. [Configuración de entornos](#7-configuración-de-entornos)

---

## 1. Visión general del sistema

**seSALE** es una agenda cultural multi-ciudad para el Alto Valle de la Patagonia.
Permite publicar y descubrir eventos (música, teatro, ferias, fiestas, etc.) con un sistema
de planes de visibilidad y espacios publicitarios. La monetización viene de planes pagos
(Destacado / Destacado Plus / Banner) procesados por MercadoPago.

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENTES                           │
│                                                         │
│   ┌──────────────────┐      ┌──────────────────┐       │
│   │   Web (Next.js)  │      │  Mobile (Expo)   │       │
│   │   Vercel         │      │  iOS / Android   │       │
│   └────────┬─────────┘      └────────┬─────────┘       │
└────────────┼────────────────────────┼──────────────────┘
             │  HTTPS + JWT           │  HTTPS + JWT
             ▼                        ▼
┌─────────────────────────────────────────────────────────┐
│                  BACKEND (FastAPI)                       │
│                  Railway — Python 3.12                   │
│                                                         │
│  ┌─────────┐ ┌──────┐ ┌───────┐ ┌────────┐ ┌───────┐  │
│  │ /events │ │/auth │ │/users │ │/cities │ │ /ads  │  │
│  └────┬────┘ └──┬───┘ └───┬───┘ └───┬────┘ └───┬───┘  │
│       │         │          │          │           │      │
│  ┌────▼─────────▼──────────▼──────────▼───────────▼──┐  │
│  │                   Services layer                    │  │
│  └─────────────────────────┬───────────────────────────┘  │
│                             │                             │
│  ┌──────────────────────────▼──────────────────────────┐  │
│  │                   SQLModel ORM                       │  │
│  └──────────────────────────┬───────────────────────────┘  │
└─────────────────────────────┼───────────────────────────┘
                              │
         ┌────────────────────┼──────────────────┐
         ▼                    ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
│  PostgreSQL  │   │   Supabase   │   │   MercadoPago    │
│  (Railway)   │   │  Auth +      │   │   API            │
│  datos app   │   │  Storage     │   │   (pagos planes) │
└──────────────┘   └──────────────┘   └──────────────────┘
```

### Principios de diseño

- **Modelo de datos completo desde la Etapa 1.** Todos los campos y tablas se crean al inicio aunque no se usen todavía. Evita migraciones disruptivas.
- **Separación de capas:** routers → services → ORM. La lógica de negocio nunca vive en los routers.
- **Stateless API:** el backend no guarda estado de sesión — el JWT viaja en cada request.
- **Auth delegada:** Supabase maneja el ciclo de vida de usuarios. El backend valida el JWT pero no gestiona contraseñas.
- **Multi-ciudad por diseño:** cada evento, ubicación y slot publicitario pertenece a una ciudad desde el día 1.
- **Un solo idioma por capa:** TypeScript en clientes, Python en backend. No mezclar.

---

## 2. Componentes y responsabilidades

### Frontend Web (`apps/web`)

| Responsabilidad | Descripción |
|---|---|
| Renderizado de páginas | Next.js App Router, SSR para Home y detalle de evento (SEO) |
| Autenticación cliente | Supabase Auth SDK — login, registro con Google y WhatsApp, refresh |
| Comunicación con API | TanStack Query — fetching, cache, estados de loading/error |
| Formularios | React Hook Form + validación Zod |
| UI | Shadcn/UI sobre Tailwind CSS, tokens de color del prototipo |
| Pagos | MercadoPago Checkout Pro (redirect) o Checkout Bricks (embedded) |

### App Mobile (`apps/mobile`)

| Responsabilidad | Descripción |
|---|---|
| Navegación | Expo Router (file-based, igual que Next.js App Router) |
| Autenticación | Mismo Supabase Auth SDK |
| Comunicación con API | TanStack Query (mismos hooks, compartidos si es posible) |
| UI | Componentes React Native con NativeWind |

### Backend (`apps/api`)

| Capa | Archivo | Responsabilidad |
|---|---|---|
| Entry point | `main.py` | Configuración de FastAPI, middlewares, CORS, rate limiting |
| Config | `core/config.py` | Variables de entorno con Pydantic Settings |
| Seguridad | `core/security.py` | Validación JWT Supabase, utilidades de auth |
| Dependencias | `core/deps.py` | Inyección de dependencias (DB session, usuario autenticado) |
| Modelos | `models/` | SQLModel — estructura de la base de datos |
| Schemas | `schemas/` | Pydantic — contratos de request y response |
| Routers | `routers/` | Endpoints HTTP organizados por recurso |
| Services | `services/` | Lógica de negocio pura, testeable sin HTTP |

---

## 3. Modelo de datos

> **Regla crítica:** el modelo de datos completo se implementa en la Etapa 1.
> Los campos que no se usan todavía se crean igualmente con valor `null` o default.
> Nunca agregar columnas a tablas existentes en producción si se pueden prever ahora.

### Diagrama de entidades

```
┌──────────┐        ┌─────────────────────────────────────┐
│  cities  │        │               events                 │
│──────────│        │─────────────────────────────────────│
│ id  PK   │◄───────│ city_id (FK)                         │
│ name     │        │ id (UUID) PK                         │
│ province │        │ title                                │
│ emoji    │        │ description                          │
│ is_active│        │ date (date, UTC)                     │
│ sort_ord │        │ time (time, UTC)                     │
└──────────┘        │ location_id (FK) ──────────────────┐ │
                    │ organizer_id (FK) ──────────────┐  │ │
                    │ status ← pending/approved/reject│  │ │
                    │ plan ← gratis/dest/pro          │  │ │
                    │ is_featured                     │  │ │
                    │ featured_until (datetime|null)  │  │ │
                    │ ticket_type ← gratis/pago/antic │  │ │
                    │ price_at_door (int|null)        │  │ │
                    │ price_advance (int|null)        │  │ │
                    │ contact_whatsapp (str|null)     │  │ │
                    │ contact_instagram (str|null)    │  │ │
                    │ contact_web (str|null)          │  │ │
                    │ contact_email (str|null)        │  │ │
                    │ flyer_url (str|null)            │  │ │
                    │ is_active                       │  │ │
                    │ created_at / updated_at         │  │ │
                    └─────────────────────────────────┘  │ │
                                      │                   │ │
              ┌───────────────────────┘                   │ │
              ▼                                           │ │
┌─────────────────────────┐      ┌──────────────────┐   │ │
│          users          │      │    locations      │◄──┘ │
│─────────────────────────│      │──────────────────│     │
│ id (UUID) PK            │      │ id (UUID) PK      │     │
│ email                   │      │ name              │     │
│ role ← user/admin       │      │ address           │     │
│ — Datos privados —      │      │ city_id (FK)      │     │
│ full_name               │      │ province          │     │
│ doc_type ← dni/cuit     │      │ latitude          │     │
│ doc_number              │      │ longitude         │     │
│ phone (privado)         │      └──────────────────┘     │
│ phone_verified          │                                │
│ email_verified          │      ┌──────────────────────┐  │
│ — Datos públicos —      │      │      ad_slots        │  │
│ public_name             │      │──────────────────────│  │
│ public_whatsapp         │      │ id (UUID) PK         │  │
│ city_id (FK)            │      │ slot_key (str)       │  │
│ is_verified (by admin)  │      │ city_id (FK)         │  │
│ is_active               │      │ img_url              │  │
│ created_at / updated_at │      │ link_url             │  │
└─────────────────────────┘      │ alt_text             │  │
              │                  │ is_active            │  │
              │                  │ advertiser_name      │  │
              ▼                  └──────────────────────┘  │
┌─────────────────────────┐                                │
│      subscriptions      │◄───────────────────────────────┘
│─────────────────────────│   (plan pago del organizador)
│ id (UUID) PK            │
│ user_id (FK)            │
│ plan ← dest/pro/banner  │
│ status ← active/expired │
│ started_at              │
│ expires_at              │
│ mp_payment_id           │  ← ID de pago en MercadoPago
│ mp_subscription_id      │  ← ID de suscripción MP (si es recurrente)
│ amount                  │
│ created_at              │
└─────────────────────────┘
```

### Definición detallada de modelos

#### `cities`
```python
class City(SQLModel, table=True):
    __tablename__ = "cities"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=100)              # "General Roca"
    province: str = Field(max_length=100)          # "Río Negro"
    emoji: str = Field(default="🏙️", max_length=10)
    is_active: bool = Field(default=False)         # admin habilita la ciudad
    sort_order: int = Field(default=99)            # orden en el selector

    # Relaciones
    events: list["Event"] = Relationship(back_populates="city")
    locations: list["Location"] = Relationship(back_populates="city")
    users: list["User"] = Relationship(back_populates="city")
    ad_slots: list["AdSlot"] = Relationship(back_populates="city")
```

#### `users`
```python
class User(SQLModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True, max_length=255)
    role: str = Field(default="user")              # "user" | "admin"
    is_active: bool = Field(default=True)

    # Datos privados — solo visibles para admin
    full_name: str = Field(max_length=255)
    doc_type: str | None = Field(default=None)     # "dni" | "cuit"
    doc_number: str | None = Field(default=None)   # encriptado en reposo
    phone: str | None = Field(default=None)        # privado, para verificación
    phone_verified: bool = Field(default=False)
    email_verified: bool = Field(default=False)

    # Datos públicos — visibles en eventos publicados
    public_name: str = Field(max_length=255)       # "El Tinglado Bar"
    public_whatsapp: str | None = Field(default=None)
    city_id: UUID | None = Field(default=None, foreign_key="cities.id")
    is_verified: bool = Field(default=False)       # admin marca como verificado

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relaciones
    city: "City" = Relationship(back_populates="users")
    organized_events: list["Event"] = Relationship(back_populates="organizer")
    subscriptions: list["Subscription"] = Relationship(back_populates="user")
```

#### `events`
```python
class EventStatus(str, Enum):
    pending  = "pending"    # esperando aprobación del admin
    approved = "approved"   # visible al público
    rejected = "rejected"   # rechazado por admin

class EventPlan(str, Enum):
    gratis = "gratis"   # básico, sin costo
    dest   = "dest"     # Destacado
    pro    = "pro"      # Destacado Plus

class TicketType(str, Enum):
    gratis   = "gratis"
    pago     = "pago"
    anticipo = "anticipo"

class Event(SQLModel, table=True):
    __tablename__ = "events"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    city_id: UUID = Field(foreign_key="cities.id", index=True)
    organizer_id: UUID = Field(foreign_key="users.id")
    location_id: UUID = Field(foreign_key="locations.id")

    # Datos principales
    title: str = Field(max_length=255)
    description: str | None = Field(default=None)
    date: date                                     # fecha del evento
    time: time                                     # hora en UTC
    category: str = Field(max_length=50)           # "musica" | "teatro" | etc.

    # Estado y visibilidad
    status: EventStatus = Field(default=EventStatus.pending)
    plan: EventPlan = Field(default=EventPlan.gratis)
    is_featured: bool = Field(default=False)       # admin puede marcar manualmente
    featured_until: datetime | None = Field(default=None)  # vencimiento del plan pago
    is_active: bool = Field(default=True)

    # Entradas
    ticket_type: TicketType = Field(default=TicketType.gratis)
    price_at_door: int | None = Field(default=None)    # en pesos ARS
    price_advance: int | None = Field(default=None)    # precio anticipo

    # Contacto (el organizador elige cuáles completar)
    contact_whatsapp: str | None = Field(default=None)
    contact_instagram: str | None = Field(default=None)
    contact_web: str | None = Field(default=None)
    contact_email: str | None = Field(default=None)

    # Media
    flyer_url: str | None = Field(default=None)    # Supabase Storage

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relaciones
    city: "City" = Relationship(back_populates="events")
    organizer: "User" = Relationship(back_populates="organized_events")
    location: "Location" = Relationship(back_populates="events")
```

#### `locations`
```python
class Location(SQLModel, table=True):
    __tablename__ = "locations"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=255)              # "El Tinglado Bar"
    address: str = Field(max_length=500)           # "Av. Roca 1240"
    city_id: UUID = Field(foreign_key="cities.id")
    latitude: float | None = Field(default=None)
    longitude: float | None = Field(default=None)

    # Relaciones
    city: "City" = Relationship(back_populates="locations")
    events: list["Event"] = Relationship(back_populates="location")
```

#### `subscriptions`
```python
class SubscriptionStatus(str, Enum):
    active  = "active"
    expired = "expired"
    cancelled = "cancelled"

class Subscription(SQLModel, table=True):
    __tablename__ = "subscriptions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id")
    plan: EventPlan                                # dest | pro (no gratis)
    status: SubscriptionStatus = Field(default=SubscriptionStatus.active)
    started_at: datetime
    expires_at: datetime
    amount: int                                    # monto pagado en ARS
    mp_payment_id: str | None = Field(default=None)       # ID pago en MercadoPago
    mp_subscription_id: str | None = Field(default=None)  # ID suscripción MP
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relaciones
    user: "User" = Relationship(back_populates="subscriptions")
```

#### `ad_slots`
```python
class AdSlot(SQLModel, table=True):
    __tablename__ = "ad_slots"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    slot_key: str = Field(max_length=50)           # "home-0", "cat-musica-1", etc.
    city_id: UUID = Field(foreign_key="cities.id")
    advertiser_name: str | None = Field(default=None)
    img_url: str | None = Field(default=None)
    link_url: str | None = Field(default=None)
    alt_text: str | None = Field(default=None)
    is_active: bool = Field(default=False)
    sort_order: int = Field(default=0)             # orden de rotación
```

### Categorías de eventos (enum)

Mapeadas del prototipo HTML. Se guardan como string en la DB.

| Key | Nombre público |
|---|---|
| `musica` | Música en vivo |
| `fiesta` | Fiesta / Baile |
| `teatro` | Teatro |
| `feria` | Feria |
| `dj` | DJ / Electrónica |
| `milonga` | Milonga / Tango |
| `pena` | Peña folclórica |
| `standup` | Stand up |
| `arte` | Exposición / Arte |
| `recital` | Recital |
| `cine` | Cine |
| `infantil` | Infantil |
| `deportes` | Deportes |

### Roles y permisos

| Rol | Permisos |
|---|---|
| `user` | Ver eventos públicos, crear eventos (quedan en `pending`), ver y editar sus propios eventos, ver sus suscripciones |
| `admin` | Todo lo anterior + aprobar/rechazar eventos, marcar `is_featured`, gestionar ciudades, gestionar `ad_slots`, ver todos los usuarios |

### Lógica de ordenamiento en el listado

El orden de eventos sigue siempre esta prioridad, dentro del mismo filtro aplicado:

```
1° → plan = "pro"   (Destacado Plus)   → más reciente primero
2° → plan = "dest"  (Destacado)        → más reciente primero
3° → plan = "gratis"                   → más reciente primero

Dentro del mismo plan, se ordena por created_at DESC.
Un evento con is_featured=True sube al tope de su grupo de plan.
```

---

## 4. Flujos principales

### Flujo de autenticación (con opciones sociales)

```
Usuario elige método:
  ├── Email + password
  ├── Continuar con Google    ─┐
  └── Continuar con WhatsApp  ─┤→ OAuth via Supabase Auth
                               │
                               ▼
                     Supabase devuelve JWT + refresh token
                               │
                               ▼
                     Cliente guarda tokens en memoria / secure storage
                               │
                               ▼
                     Cada request → Authorization: Bearer <JWT>
                               │
                               ▼
                     Backend valida JWT (core/security.py)
                       ├── ✓ Válido → extrae user_id → deps.py
                       └── ✗ Inválido → 401 Unauthorized
```

### Flujo de publicación de evento

```
Usuario completa formulario de publicación
        │
        ▼
  POST /api/events  (user autenticado)
        │
        ▼
  Backend crea evento con status = "pending"
        │
        ▼
  Admin recibe notificación (futura — Etapa 3)
        │
        ▼
  Admin aprueba → status = "approved"  →  evento visible al público
  Admin rechaza → status = "rejected"  →  usuario es notificado
```

### Flujo de pago de plan (MercadoPago) — Etapa 6

```
Usuario selecciona plan (Destacado / Destacado Plus / Banner)
        │
        ▼
  POST /api/subscriptions/checkout
        │
        ▼
  Backend crea preferencia de pago en MercadoPago API
  → devuelve init_point URL
        │
        ▼
  Frontend redirige al Checkout Pro de MercadoPago
        │
        ▼
  Usuario paga en MP
        │
        ▼
  MP llama al webhook: POST /api/webhooks/mercadopago
        │
        ▼
  Backend verifica la firma del webhook (seguridad)
  → actualiza Subscription a status="active"
  → actualiza Event.plan y Event.featured_until
        │
        ▼
  Usuario regresa a la app → ve su plan activo
```

### Flujo de compartir evento por WhatsApp

```
Usuario toca "Compartir" en el detalle del evento
        │
        ▼
  Frontend arma el mensaje:
  "{título} · {fecha} · {lugar}. ¡Organicemos para ir!
   Lo vi en seSALE: {url_del_evento}"
        │
        ▼
  Si el navegador soporta Web Share API → navigator.share()
  Si no → window.open("https://wa.me/?text=...")
```

---

## 5. API — Endpoints planificados

Los endpoints se implementan por etapas pero se documentan completos acá
para que el agente conozca el plan antes de diseñar cualquier parte.

### Auth (`/api/auth`)
```
POST   /api/auth/register              Registro con email/password
POST   /api/auth/login                 Login (delegado a Supabase)
POST   /api/auth/refresh               Refresh token
POST   /api/auth/logout                Logout
```

### Eventos (`/api/events`)
```
GET    /api/events                     Listar eventos aprobados y activos
                                       Filtros: city_id, category, date_from,
                                                date_to, moment (dia|noche),
                                                plan, search
GET    /api/events/{id}                Detalle de un evento (público)
POST   /api/events                     Crear evento (user autenticado → pending)
PUT    /api/events/{id}                Editar evento propio (user) o cualquiera (admin)
DELETE /api/events/{id}                Eliminar (admin) o desactivar (user propio)
PATCH  /api/events/{id}/status         Aprobar / rechazar (admin)
PATCH  /api/events/{id}/featured       Marcar como destacado (admin)
GET    /api/events/mine                Mis eventos: pending + approved + rejected (user)
```

### Usuarios (`/api/users`)
```
GET    /api/users/me                   Perfil completo del usuario autenticado
PUT    /api/users/me                   Actualizar perfil propio
GET    /api/users                      Listar usuarios (admin)
GET    /api/users/{id}                 Ver usuario (admin)
PATCH  /api/users/{id}/role            Cambiar rol (admin)
PATCH  /api/users/{id}/verify          Marcar como verificado (admin)
DELETE /api/users/{id}                 Desactivar usuario (admin)
```

### Ciudades (`/api/cities`)
```
GET    /api/cities                     Listar todas las ciudades (público)
GET    /api/cities/{id}                Detalle de ciudad (público)
POST   /api/cities                     Crear ciudad (admin)
PATCH  /api/cities/{id}/toggle         Habilitar / deshabilitar ciudad (admin)
```

### Ubicaciones (`/api/locations`)
```
GET    /api/locations                  Listar ubicaciones (público, filtrable por city_id)
GET    /api/locations/{id}             Detalle (público)
POST   /api/locations                  Crear ubicación (user autenticado)
PUT    /api/locations/{id}             Editar (admin)
```

### Suscripciones y pagos (`/api/subscriptions`)
```
GET    /api/subscriptions/me           Ver mis suscripciones activas
POST   /api/subscriptions/checkout     Crear preferencia de pago en MP → devuelve init_point
GET    /api/subscriptions              Listar todas (admin)
```

### Webhooks (`/api/webhooks`)
```
POST   /api/webhooks/mercadopago       Recibe notificaciones de pago de MP
                                       Valida firma → actualiza subscription + evento
```

### Espacios publicitarios (`/api/ads`)
```
GET    /api/ads                        Listar slots activos por city_id y slot_key (público)
POST   /api/ads                        Crear slot (admin)
PUT    /api/ads/{id}                   Editar slot (admin)
PATCH  /api/ads/{id}/toggle            Activar / desactivar slot (admin)
```

---

## 6. Etapas de desarrollo

> Cada etapa debe tener sus tests escritos y pasando antes de cerrarla.
> El modelo de datos completo (todas las tablas y columnas) se crea en la Etapa 1.

| Etapa | Qué se construye | Notas |
|---|---|---|
| **1** | Home con lista de eventos. GET /api/events con filtros. SQLite local + Alembic configurado. **Modelo de datos completo** creado aunque los campos no se usen todavía. | Datos de prueba (seed) incluidos |
| **2** | API para crear eventos + frontend del formulario. Fechas futuras, ocultar eventos vencidos. | Eventos en `pending` por defecto |
| **3** | Usuarios, roles, login (Google + WhatsApp + email). El usuario ve sus eventos por estado. Verificación DNI/CUIT en modelo (campo guardado, sin validación externa por ahora). | Auth con Supabase |
| **4** | Vista detalle del evento + todos los links de contacto (WA, IG, web, email, mapa). | Read-only, sin pagos todavía |
| **5** | Sistema de destacados: ordenamiento pro → dest → gratis. Admin puede marcar `is_featured` manualmente. | Sin pago todavía |
| **6** | MercadoPago: pago de planes, webhooks, activación automática del plan. | Integración compleja — etapa propia |
| **7** | Multi-ciudad: selector de ciudad, filtrado por ciudad, admin habilita/deshabilita ciudades. | Ya modelado desde Etapa 1 |
| **8** | Espacios publicitarios (banners): CRUD de `ad_slots` desde admin, render en frontend. | |
| **9** | App mobile (Expo) — consume la misma API. | |

---

## 7. Configuración de entornos

### Variables de entorno requeridas

Ver [`.env.example`](./.env.example) para la lista completa.

```bash
# ── Backend ──────────────────────────────────────────────
DATABASE_URL=sqlite:///./sesale.db          # Etapa 1 local
# DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/sesale  # producción

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_JWT_SECRET=tu-jwt-secret-de-supabase
SUPABASE_ANON_KEY=tu-anon-key

MERCADOPAGO_ACCESS_TOKEN=tu-access-token   # Etapa 6
MERCADOPAGO_WEBHOOK_SECRET=tu-webhook-secret

ENVIRONMENT=development                    # development | production
ALLOWED_ORIGINS=http://localhost:3000,https://sesale.com.ar

# ── Frontend (Next.js — NEXT_PUBLIC_ se expone al cliente) ──
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
NEXT_PUBLIC_MP_PUBLIC_KEY=tu-public-key-de-mp
```

### Entornos

| Entorno | Frontend | Backend | Base de datos |
|---|---|---|---|
| **Local (Etapa 1-2)** | `localhost:3000` | `localhost:8000` | SQLite (archivo local) |
| **Local (Etapa 3+)** | `localhost:3000` | `localhost:8000` | PostgreSQL en Docker |
| **Staging** | Vercel preview | Railway (staging) | Railway Postgres |
| **Producción** | Vercel production | Railway (prod) | Railway Postgres |

### Cómo correr el proyecto localmente

```bash
# 1. Clonar el repo
git clone <url-del-repo>
cd sesale

# 2. Variables de entorno
cp .env.example .env
# Completar .env con los valores reales

# 3. Backend (Etapas 1-2 — SQLite, sin Docker necesario)
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head          # crea las tablas
python seed.py                # carga datos de prueba
uvicorn app.main:app --reload  # http://localhost:8000
                               # docs: http://localhost:8000/docs

# 4. Frontend
cd ../../apps/web
npm install
npm run dev                    # http://localhost:3000

# 5. Tests (siempre antes de commitear)
cd apps/api && pytest --cov=app
cd apps/web && npm run test
```
