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
│  (Railway)   │   │  Storage     │   │   API            │
│  datos app + │   │  (flyers)    │   │   (pagos planes) │
│  auth (JWT)  │   │              │   │                  │
└──────────────┘   └──────────────┘   └──────────────────┘
```

### Principios de diseño

- **Modelo de datos completo desde la Etapa 1.** Todos los campos y tablas se crean al inicio aunque no se usen todavía. Evita migraciones disruptivas.
- **Separación de capas:** routers → services → ORM. La lógica de negocio nunca vive en los routers.
- **Stateless API:** el backend no guarda estado de sesión — el JWT viaja en cada request.
- **Auth propia (Etapa 3):** el backend emite y valida sus propios JWT (`python-jose`) y gestiona las contraseñas hasheadas con `passlib`/`bcrypt` contra la tabla `users` de Postgres. Se evaluó Supabase Auth pero se difirió — ver nota en la sección 6.
- **Multi-ciudad por diseño:** cada evento, ubicación y slot publicitario pertenece a una ciudad desde el día 1.
- **Un solo idioma por capa:** TypeScript en clientes, Python en backend. No mezclar.

---

## 2. Componentes y responsabilidades

### Frontend Web (`apps/web`)

| Responsabilidad | Descripción |
|---|---|
| Renderizado de páginas | Next.js App Router, SSR para Home y detalle de evento (SEO) |
| Autenticación cliente | Login/registro propios contra `/api/auth`. `access_token` en memoria (nunca localStorage), `refresh_token` en cookie httpOnly que gestiona el backend |
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
| Seguridad | `core/security.py` | Hash de passwords (`passlib`/`bcrypt`), emisión y validación de JWT propios (`python-jose`) |
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
                    │ plan ← gratis/dest/pro/banner   │  │ │
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
│ plan_id (FK) ───────────┼──────┐
│ plan_price_id (FK) ─────┼───┐  │
│ status ← active/expired/│   │  │
│   cancelled/pending_pay │   │  │
│ starts_at               │   │  │
│ expires_at              │   │  │
│ mp_payment_id           │   │  │  ← ID de pago en MercadoPago
│ mp_subscription_id      │   │  │  ← ID de suscripción MP (recurrente)
│ amount_paid             │   │  │
│ currency = "ARS"        │   │  │
│ created_at              │   │  │
│ approved_by (FK|null)   │   │  │
│ notes                   │   │  │
└─────────────────────────┘   │  │
                               ▼  ▼
                    ┌────────────────────────────┐   ┌──────────────┐
                    │        plan_prices          │──►│    plans     │
                    │──────────────────────────── │   │──────────────│
                    │ id (UUID) PK                │   │ id (UUID) PK │
                    │ plan_id (FK)                │   │ name         │
                    │ amount (ARS, 0 si gratis)   │   │ plan_type ←  │
                    │ currency = "ARS"            │   │  gratis/dest/│
                    │ valid_from                  │   │  pro/banner  │
                    │ valid_until (null=vigente)  │   │ pricing_type←│
                    │ promo_label (null)          │   │  fixed/custom│
                    │ created_by (FK users)       │   │ description  │
                    │ notes                       │   │ is_active    │
                    └─────────────────────────────┘   └──────────────┘
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

    # None -> el usuario se registró solo. UUID -> el admin que creó la cuenta
    # (flujo de admin creando cuentas para clientes de banner — Etapa 5.6)
    created_by: UUID | None = Field(default=None, foreign_key="users.id")

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

class PlanType(str, Enum):
    gratis = "gratis"   # sin costo, sin pago
    dest   = "dest"     # Destacado — precio fijo
    pro    = "pro"      # Destacado Plus — precio fijo
    banner = "banner"   # Banner web — precio a convenir

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
    time: time                                     # hora inicio, en UTC
    time_end: time | None = Field(default=None)    # hora fin (Etapa 4)
    # category (str único) y moment (str único) vivieron acá hasta la
    # Etapa 6.5 — ahora son las tablas event_categories / event_moments
    # de abajo. moment se calcula siempre desde time/time_end, nunca se
    # elige a mano.

    # Estado y visibilidad
    status: EventStatus = Field(default=EventStatus.pending)
    plan: PlanType = Field(default=PlanType.gratis)
    is_featured: bool = Field(default=False)       # admin puede marcar manualmente
    featured_until: datetime | None = Field(default=None)  # vencimiento del plan pago
    is_active: bool = Field(default=True)
    available_on_site: bool = Field(default=False)  # "habrá lugar en la puerta" (Etapa 4)

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
    category_links: list["EventCategory"] = Relationship(back_populates="event")
    moment_links: list["EventMoment"] = Relationship(back_populates="event")

    @property
    def categories(self) -> list[str]:
        return [link.category for link in self.category_links]
```

#### `event_categories` (Etapa 6.5)

Many-to-many evento/categoría — reemplaza el campo `Event.category` único.
Un evento tiene entre 1 y 3 categorías (validado en `EventCreate`/`EventUpdate`).

```python
class EventCategory(SQLModel, table=True):
    __tablename__ = "event_categories"

    event_id: UUID = Field(foreign_key="events.id", primary_key=True)
    category: str = Field(primary_key=True, max_length=50)  # ver enum de categorías más abajo

    event: "Event" = Relationship(back_populates="category_links")
```

#### `event_moments` (Etapa 6.5)

Momento del evento (diurno/nocturno) — reemplaza el campo `Event.moment`
único. Se recalcula con `app.core.moment.calculate_moments(time, time_end)`
cada vez que se crea o edita un evento; un evento con horario 18:00-22:00
tiene ambos registros.

```python
class EventMoment(SQLModel, table=True):
    __tablename__ = "event_moments"

    event_id: UUID = Field(foreign_key="events.id", primary_key=True)
    moment: str = Field(primary_key=True, max_length=20)  # "diurno" | "nocturno"

    event: "Event" = Relationship(back_populates="moment_links")
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

#### `plans`

Catálogo de planes pagos disponibles (Destacado, Destacado Plus, Banner web).
Los precios NO viven acá — viven en `plan_prices`, para poder cambiarlos sin
perder el histórico de lo que pagó cada suscripción.

```python
class PlanType(str, Enum):
    gratis = "gratis"   # sin costo, sin pago
    dest   = "dest"     # Destacado — precio fijo
    pro    = "pro"      # Destacado Plus — precio fijo
    banner = "banner"   # Banner web — precio a convenir

class PricingType(str, Enum):
    fixed  = "fixed"    # precio fijo, se paga online (MP)
    custom = "custom"   # precio a convenir, admin lo carga

class Plan(SQLModel, table=True):
    __tablename__ = "plans"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=100)               # "Destacado", "Destacado Plus", "Banner web"
    plan_type: PlanType
    pricing_type: PricingType
    description: str | None = Field(default=None)
    is_active: bool = Field(default=True)

    # Relaciones
    prices: list["PlanPrice"] = Relationship(back_populates="plan")
    subscriptions: list["Subscription"] = Relationship(back_populates="plan")
```

#### `plan_prices`

Histórico de precios por plan. Cada `Subscription` referencia el precio
vigente al momento de la compra (`plan_price_id`), así un cambio de precio
futuro nunca altera lo que ya se cobró.

```python
class PlanPrice(SQLModel, table=True):
    __tablename__ = "plan_prices"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    plan_id: UUID = Field(foreign_key="plans.id")
    amount: int = Field(default=0)                  # en ARS, 0 si es gratis
    currency: str = Field(default="ARS", max_length=10)
    valid_from: date                                # desde cuándo rige este precio
    valid_until: date | None = Field(default=None)  # None = vigente hasta nuevo precio
    promo_label: str | None = Field(default=None)   # "Promo lanzamiento", "3x2", etc.
    created_by: UUID = Field(foreign_key="users.id")  # admin que lo cargó
    notes: str | None = Field(default=None)          # uso interno, ej: "acordado con Juan Bar"

    # Relaciones
    plan: "Plan" = Relationship(back_populates="prices")
    subscriptions: list["Subscription"] = Relationship(back_populates="plan_price")
```

#### `subscriptions`

```python
class SubscriptionStatus(str, Enum):
    active          = "active"
    expired         = "expired"
    cancelled       = "cancelled"
    pending_payment = "pending_payment"

class Subscription(SQLModel, table=True):
    __tablename__ = "subscriptions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id")
    plan_id: UUID = Field(foreign_key="plans.id")
    plan_price_id: UUID = Field(foreign_key="plan_prices.id")  # precio congelado al momento de compra
    status: SubscriptionStatus = Field(default=SubscriptionStatus.pending_payment)
    starts_at: datetime
    expires_at: datetime
    mp_payment_id: str | None = Field(default=None)       # solo para fixed
    mp_subscription_id: str | None = Field(default=None)
    amount_paid: int                                # lo que efectivamente pagó, copia del price al momento
    currency: str = Field(default="ARS", max_length=10)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    approved_by: UUID | None = Field(default=None, foreign_key="users.id")  # admin que aprobó (custom/banner)
    notes: str | None = Field(default=None)

    # Relaciones
    user: "User" = Relationship(back_populates="subscriptions")
    plan: "Plan" = Relationship(back_populates="subscriptions")
    plan_price: "PlanPrice" = Relationship(back_populates="subscriptions")
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

#### `reports` (Etapa 6.5)

Reporte de un evento hecho por un usuario **sin login**. Requiere texto
descriptivo y teléfono de contacto; el reporte genera un email al admin
(Resend) y queda visible en el panel admin aunque el email falle.

```python
class Report(SQLModel, table=True):
    __tablename__ = "reports"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    event_id: UUID = Field(foreign_key="events.id", index=True)
    text: str = Field(max_length=1000)              # mín. 10, máx. 1000
    contact_phone: str = Field(max_length=50)
    ip_address: str | None = Field(default=None, max_length=45)  # auditoría + rate limit
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    phone_verified: bool = Field(default=False)     # validación futura del teléfono
    status: str = Field(default="pending")          # "pending" | "reviewed" | "dismissed"
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

El orden de eventos en `GET /api/events` sigue siempre esta prioridad (implementado
como un único `ORDER BY` en el ORM — Etapa 5), sin importar qué filtros
(`city_id`, `category`, `date_from`, `date_to`, `search`) estén activos: los filtros
reducen el conjunto de resultados, pero el orden interno no cambia.

```
1° → plan = "pro"    + is_featured = True   → más reciente primero
2° → plan = "pro"    + is_featured = False  → más reciente primero
3° → plan = "dest"   + is_featured = True   → más reciente primero
4° → plan = "dest"   + is_featured = False  → más reciente primero
5° → plan = "gratis" + is_featured = True   → más reciente primero
6° → plan = "gratis" + is_featured = False  → más reciente primero

Dentro de cada uno de estos 6 niveles, se ordena por created_at DESC.
```

---

## 4. Flujos principales

### Flujo de autenticación (JWT propio — Etapa 3)

```
POST /api/auth/register (email, password, datos privados y públicos)
        │
        ▼
  Backend hashea password (bcrypt) y crea el user (role="user")

POST /api/auth/login (email, password)
        │
        ▼
  Backend valida credenciales → emite access_token (30 min) + refresh_token (7 días)
        │
        ├── access_token   → body de la respuesta → frontend lo guarda EN MEMORIA
        └── refresh_token  → cookie httpOnly + Secure (prod) + SameSite → el
                              frontend nunca la lee directamente

Cada request protegido → Authorization: Bearer <access_token>
        │
        ▼
  Backend valida el JWT (core/security.py + core/deps.py)
    ├── ✓ Válido y usuario activo → deps.get_current_user()
    └── ✗ Inválido / expirado    → 401 Unauthorized

POST /api/auth/refresh (sin body, usa la cookie)
        │
        ▼
  Backend valida el refresh_token contra el hash guardado en users.refresh_token_hash
    ├── ✓ Válido → rota el refresh token (nuevo access + nuevo refresh + nueva cookie)
    └── ✗ Inválido / vencido / ya reemplazado → 401 (el frontend redirige a /login)

POST /api/auth/logout (requiere access_token)
        │
        ▼
  Backend borra users.refresh_token_hash y expira la cookie → sesión terminada
```

**Sesión única:** cada login sobreescribe el `refresh_token_hash` anterior en
`users`, así que iniciar sesión en un dispositivo nuevo cierra la sesión anterior.
Se puede migrar a una tabla `refresh_tokens` dedicada si en el futuro hace falta
soportar múltiples sesiones/dispositivos activos por usuario.

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

### Flujo de pago de plan (MercadoPago) — Etapa 6 ✓ implementado

```
Usuario ve /planes (desde "Elegir plan" en el evento ya publicado,
o desde "Mi cuenta" → Mi plan)
        │
        ▼
  Plan gratis → botón deshabilitado "Tu plan actual"
  Plan banner → botón "Consultar" → abre WhatsApp (SESALE_WHATSAPP), sin pasar por MP
  Plan dest/pro → botón "Contratar"
        │
        ▼
  POST /api/subscriptions/checkout { plan_id }
        │
        ▼
  Backend valida que el plan sea fixed (no gratis/banner), obtiene el
  PlanPrice vigente, crea la preferencia en MercadoPago API (SDK oficial,
  ACCESS_TOKEN solo en el backend) y guarda una Subscription
  status="pending_payment" con mp_payment_id=preference_id
  → devuelve { init_point }
        │
        ▼
  Frontend: window.location.href = init_point (redirect completo a
  Checkout Pro, no Bricks/embedded)
        │
        ▼
  Usuario paga en MP → MP redirige a /planes/pago-exitoso,
  /planes/pago-fallido o /planes/pago-pendiente según el resultado
        │
        ▼
  En paralelo, MP llama al webhook: POST /api/webhooks/mercadopago
        │
        ▼
  Backend verifica la firma (header x-signature: ts+v1, HMAC-SHA256 con
  MERCADOPAGO_WEBHOOK_SECRET) → 400 si no coincide, sin tocar la DB
        │
        ▼
  Con firma válida, reconfirma el pago contra la API de MP
  (nunca confía en el body del webhook)
        │
        ├── approved → activa/crea la Subscription (idempotente por
        │              mp_payment_id real), status="active",
        │              starts_at=ahora, expires_at=ahora+30 días, y
        │              actualiza Event.plan/Event.featured_until de todos
        │              los eventos approved+activos del organizador
        │
        └── rejected/cancelled → Subscription.status="cancelled"
        │
        ▼
  Responde 200 a MP siempre (salvo firma inválida)

Vencimiento: POST /api/admin/subscriptions/expire (admin o llamada
interna, sin scheduler todavía) marca status="expired" las Subscription
vencidas y revierte los eventos del organizador a plan="gratis".

Plan Banner (pricing_type=custom): no pasa por MP. El admin carga la
Subscription y la activa manualmente con
PATCH /api/admin/subscriptions/{id}/activate, mismo efecto que el
webhook aprobado.
```

### Flujo de compartir por WhatsApp (Etapa 6.5)

Dos puntos de entrada distintos — nunca se mezclan:

```
Home ("Compartir seSALE", ShareBanner) → comparte la app en general
        │
        ▼
  Frontend arma: title "seSALE — Agenda cultural del Alto Valle",
  text "¡Encontrá todos los eventos culturales de la Patagonia en
  seSALE!", url = window.location.origin (sin /eventos/...)
        │
        ▼
  Si el navegador soporta Web Share API → navigator.share()
  Si no → window.open("https://wa.me/?text=...")

Detalle del evento ("Compartir", EventDetailView) → comparte ESE evento
        │
        ▼
  Frontend arma: title "{título} — seSALE", text con título, fecha
  legible, hora en formato 24hs (formatEventTime) y lugar,
  url = window.location.origin + "/eventos/" + event.id
        │
        ▼
  Si el navegador soporta Web Share API → navigator.share()
  Si no → window.open("https://wa.me/?text=...")
```

---

## 5. API — Endpoints planificados

Los endpoints se implementan por etapas pero se documentan completos acá
para que el agente conozca el plan antes de diseñar cualquier parte.

### Auth (`/api/auth`) — implementado en Etapa 3, JWT propio
```
POST   /api/auth/register              Registro con email/password + datos privados/públicos
POST   /api/auth/login                 Login → access_token en el body, refresh_token en cookie httpOnly
POST   /api/auth/refresh               Renueva el access_token (lee la cookie, la rota)
POST   /api/auth/logout                Invalida el refresh_token (requiere estar autenticado)
```

### Eventos (`/api/events`)
```
GET    /api/events                     Listar eventos aprobados y activos      ✓ Etapa 6.5
                                       Filtros: city_id, category (repetible:
                                                ?category=a&category=b es OR),
                                                moment (diurno|nocturno, JOIN
                                                con event_moments — un evento
                                                dual aparece en ambos),
                                                date_from, date_to, plan, search
                                       category ahora es multi-valor por
                                       evento (event_categories); el filtro
                                       sigue devolviendo eventos con AL MENOS
                                       UNA de las categorías/momento pedidos
GET    /api/events/{id}                Detalle completo de un evento     ✓ Etapa 4
                                       (evento + ubicación + ciudad + datos
                                       públicos del organizador). approved+activo:
                                       público. pending/rejected: solo el
                                       organizador (JWT). Resto: 404
POST   /api/events                     Crear evento (user autenticado → pending)
                                       body admite organizer_id opcional        ✓ Etapa 5.6
                                       (solo tiene efecto si quien publica es
                                       admin: crea el evento en nombre de ese
                                       organizador; para "user" se ignora)
PUT    /api/events/{id}                Editar evento propio (user) o cualquiera  ✓ Etapa 4
                                       (admin). Si edita el organizador, status
                                       vuelve a pending; si edita el admin, no
                                       cambia. 403 para cualquier otro usuario
DELETE /api/events/{id}                Soft delete (is_active=False). Permitido    ✓ Etapa 5.6
                                       para el organizador dueño o un admin
PATCH  /api/events/{id}/status         Aprobar / rechazar (admin)
PATCH  /api/events/{id}/featured       Marcar/desmarcar destacado (admin)              ✓ Etapa 5
                                       body: { is_featured: bool, featured_until:
                                       datetime|null }. featured_until=null → destacado
                                       indefinido. El vencimiento automático (cron/job)
                                       se implementa en Etapa 6 junto con MercadoPago
PATCH  /api/events/{id}/plan           Cambiar plan del evento (admin)                  ✓ Etapa 5
                                       body: { plan: "gratis"|"dest"|"pro" }. Asignación
                                       manual sin cobro — el pago automático vía
                                       MercadoPago llega en Etapa 6
GET    /api/events/mine                Mis eventos: pending + approved + rejected (user)
POST   /api/events/{id}/report         Reportar un evento (público, sin login)  ✓ Etapa 6.5
                                       Body: { text (10-1000 chars), contact_phone
                                       (requerido) }. Rate limit: 3 por IP por hora
                                       (slowapi, key = X-Forwarded-For o
                                       request.client.host). 404 si el evento no
                                       existe o no está approved. Guarda el reporte
                                       y envía un email al admin (Resend) — si el
                                       email falla, se loguea pero no se falla el
                                       endpoint (el reporte ya quedó guardado)
```

### Usuarios (`/api/users`)
```
GET    /api/users/me                   Perfil completo del usuario autenticado    ✓ Etapa 3
PUT    /api/users/me                   Actualizar perfil propio                   ✓ Etapa 3
GET    /api/users                      Listar usuarios (admin)                    ✓ Etapa 3
GET    /api/users/{id}                 Ver usuario (admin)                        ✓ Etapa 3
PATCH  /api/users/{id}/verify          Marcar como verificado (admin)             ✓ Etapa 3
PATCH  /api/users/{id}/role            Cambiar rol (admin)                        planificado
DELETE /api/users/{id}                 Desactivar usuario (admin)                 planificado
```

### Admin (`/api/admin`)

Todas las rutas requieren rol `admin` (401 sin auth, 403 para `user`).

```
GET    /api/admin/events               Todos los eventos, sin filtrar por status   ✓ Etapa 5.6
                                       ni is_active. Incluye organizer_id y
                                       organizer_public_name (join con User).
                                       Filtros: status, city_id, category, plan,
                                       search, date_from, date_to. Paginación:
                                       limit (default 50) / offset. Orden: pending
                                       primero, luego created_at DESC
POST   /api/admin/users                Crea una cuenta en nombre de un cliente     ✓ Etapa 5.6
                                       (ej. de banner). Guarda created_by = id
                                       del admin autenticado. Body: email,
                                       password, public_name, full_name, city_id,
                                       role, doc_type, doc_number, phone
```

### Ciudades (`/api/cities`)
```
GET    /api/cities                     Listar ciudades activas (público)          ✓ Etapa 3
GET    /api/cities/{id}                Detalle de ciudad (público)                planificado
POST   /api/cities                     Crear ciudad (admin)                       planificado
PATCH  /api/cities/{id}/toggle         Habilitar / deshabilitar ciudad (admin)    planificado
```

### Ubicaciones (`/api/locations`)
```
GET    /api/locations                  Listar ubicaciones (público, filtrable por city_id)
GET    /api/locations/{id}             Detalle (público)
POST   /api/locations                  Crear ubicación (user autenticado)
PUT    /api/locations/{id}             Editar (admin)
```

### Estadísticas (`/api/stats`)
```
GET    /api/stats                      Estadísticas agregadas (público)         ✓ Etapa 4.5
                                       { total_events, total_organizers,
                                         total_cities } — sobre eventos
                                       status=approved e is_active=True
```

### Planes (`/api/plans`) ✓ Etapa 6
```
GET    /api/plans                      Público. Planes activos con su PlanPrice
                                       vigente (valid_from <= hoy y valid_until
                                       null o >= hoy). price=null si no hay
                                       precio vigente (ej. plan Banner)
```

### Suscripciones y pagos (`/api/subscriptions`) ✓ Etapa 6
```
POST   /api/subscriptions/checkout     User o admin autenticado. Body: { plan_id }.
                                       400 si el plan es gratis o banner (no pasan
                                       por MP) o si no tiene precio vigente. Crea
                                       la preferencia en MercadoPago y una
                                       Subscription pending_payment. Devuelve
                                       { init_point }
GET    /api/subscriptions/me           Autenticado. Lista las Subscription propias
                                       (plan, status, fechas, monto pagado, promo)
```

### Webhooks (`/api/webhooks`) ✓ Etapa 6
```
POST   /api/webhooks/mercadopago       Sin JWT (MP no manda token de usuario), pero
                                       con verificación obligatoria de x-signature.
                                       400 si falta o no coincide la firma. Con
                                       firma válida, reconfirma el pago contra la
                                       API de MP y activa/cancela la Subscription
                                       correspondiente. Idempotente por
                                       mp_payment_id. Siempre responde 200 salvo
                                       firma inválida
```

### Suscripciones — administración (`/api/admin`) ✓ Etapa 6
```
GET    /api/admin/subscriptions               Admin. Filtros: status, plan_id,
                                              user_id, date_from, date_to. Orden:
                                              created_at DESC. Incluye datos del
                                              usuario (email, public_name)
PATCH  /api/admin/subscriptions/{id}/activate  Admin. Body: { expires_at }. Activa
                                              una Subscription a mano (flujo del
                                              plan Banner) con el mismo efecto que
                                              el webhook aprobado
POST   /api/admin/subscriptions/expire         Admin (o llamada interna). Marca
                                              expired las Subscription vencidas y
                                              revierte los eventos del organizador
                                              a plan=gratis. Sin scheduler todavía
                                              — se invoca periódicamente a mano
```

### Reportes — administración (`/api/admin`) ✓ Etapa 6.5
```
GET    /api/admin/reports              Admin. Filtros: status, event_id,
                                       date_from, date_to. Orden: created_at
                                       DESC. Incluye event_title (join con Event)
PATCH  /api/admin/reports/{id}/status  Admin. Body: { status: "reviewed"|"dismissed" }
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
| **3** | Usuarios, roles, login con JWT propio (email + password). Migración a PostgreSQL (Docker Compose). El usuario ve sus eventos por estado. Verificación DNI/CUIT en modelo (campo guardado, sin validación externa por ahora). | Auth JWT propia (`python-jose` + `passlib`/`bcrypt`) — Supabase Auth se evalúa en Etapa 6 si hace falta login social |
| **4** | Vista detalle del evento + todos los links de contacto (WA, IG, web, email, mapa). | Read-only, sin pagos todavía |
| **4.5** | Correcciones de modelo y endpoints pendientes: migración AdSlot, organizer_id en EventRead, endpoint GET /api/stats | Etapa de limpieza, sin features nuevas |
| **5** | Sistema de destacados: ordenamiento por plan en GET /api/events, endpoints admin para gestión de plan e is_featured, badges visuales en cards del home | Sin pago todavía |
| **5.6** | Bugs de auth y navbar, perfil en Mi cuenta, panel admin completo de eventos, admin crea usuarios y eventos para otros | `created_by` en `users`, `GET /api/admin/events`, `POST /api/admin/users` |
| **6** | MercadoPago: pago de planes, webhooks, activación automática del plan. | ✓ Completa: pantalla `/planes`, checkout con SDK oficial, webhook con verificación de firma + reconfirmación contra la API de MP, activación automática de eventos, vencimiento (`/api/admin/subscriptions/expire`), gestión admin de suscripciones y activación manual del plan Banner |
| **6.5** | Mejoras de modelo y features pendientes: hora en formato 24hs (Argentina), categorías múltiples por evento, momento dual (diurno y nocturno calculado), compartir por WhatsApp (home y detalle), reporte de eventos sin login. | ✓ Completa: `event_categories` y `event_moments` reemplazan los campos únicos `category`/`moment` de `events` (migración `0007`), tabla `reports` (migración `0008`), `POST /api/events/{id}/report` con rate limit y email vía Resend, panel admin de reportes |
| **7** | Multi-ciudad: selector de ciudad, filtrado por ciudad, admin habilita/deshabilita ciudades. | Ya modelado desde Etapa 1 |
| **8** | Espacios publicitarios (banners): CRUD de `ad_slots` desde admin, render en frontend. | |
| **9** | App mobile (Expo) — consume la misma API. | |

---

## 7. Configuración de entornos

### Variables de entorno requeridas

Ver [`.env.example`](./.env.example) para la lista completa.

```bash
# ── Backend ──────────────────────────────────────────────
DATABASE_URL=postgresql+psycopg://sesale:sesale@localhost:5432/sesale  # Etapa 3+ (Docker Compose)
# DATABASE_URL=sqlite:///./sesale.db          # Etapa 1-2 (histórico, ya no se usa)

SECRET_KEY=tu-secret-key-larga-y-aleatoria   # firma de los JWT propios
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

MERCADOPAGO_ACCESS_TOKEN=tu-access-token   # Etapa 6 — solo backend, nunca en el frontend
MERCADOPAGO_PUBLIC_KEY=tu-public-key-de-mp
MERCADOPAGO_WEBHOOK_SECRET=tu-webhook-secret

SESALE_WHATSAPP=549XXXXXXXXXX              # contacto para el plan Banner ("Consultar")
FRONTEND_URL=http://localhost:3000         # back_urls de la preferencia de MP + link del panel admin en el email de reporte
API_URL=http://localhost:8000              # notification_url del webhook de MP

RESEND_API_KEY=                            # Etapa 6.5 — email de reporte de eventos
ADMIN_EMAIL=admin@sesale.com.ar            # Etapa 6.5 — destinatario del email de reporte

ENVIRONMENT=development                    # development | production
ALLOWED_ORIGINS=http://localhost:3000,https://sesale.com.ar

# ── Frontend (Next.js — NEXT_PUBLIC_ se expone al cliente) ──
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MP_PUBLIC_KEY=tu-public-key-de-mp   # no se usa en Etapa 6 (checkout es redirect, no Bricks)
NEXT_PUBLIC_SESALE_WHATSAPP=549XXXXXXXXXX       # mismo número que SESALE_WHATSAPP, expuesto al cliente
```

### Entornos

| Entorno | Frontend | Backend | Base de datos |
|---|---|---|---|
| **Local (Etapa 1-2, histórico)** | `localhost:3000` | `localhost:8000` | SQLite (archivo local) |
| **Local (Etapa 3+)** | `localhost:3000` | `localhost:8000` | PostgreSQL en Docker Compose |
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

# 3. Base de datos (Etapa 3+ — PostgreSQL vía Docker Compose)
docker compose up -d db

# 4. Backend
cd apps/api
uv sync --all-extras
uv run alembic upgrade head    # crea las tablas
uv run python seed.py          # carga datos de prueba
uv run uvicorn app.main:app --reload  # http://localhost:8000
                               # docs: http://localhost:8000/docs
# nota: los tests (pytest) siguen usando SQLite in-memory, no necesitan Docker

# 5. Frontend
cd ../../apps/web
npm install
npm run dev                    # http://localhost:3000

# 6. Tests (siempre antes de commitear)
cd apps/api && uv run pytest --cov=app
cd apps/web && npm run test
```
