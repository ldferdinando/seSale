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
│ — Datos públicos —      │      │       ad_slots        │  │
│ public_name             │      │──────────────────────│  │
│ public_whatsapp         │      │ id (UUID) PK         │  │
│ city_id (FK)            │      │ city_id (FK)         │  │
│ is_verified (by admin)  │      │ section (str)        │  │
│ is_active               │      │ slot_position (int)  │  │
│ created_at / updated_at │      │ rotation_mode        │  │
└─────────────────────────┘      │ rotation_interval_s  │  │
              │                  │ is_active            │  │
              │                  └──────────┬───────────┘  │
              │                             │ 1:N          │
              │                  ┌──────────▼───────────┐  │
              │                  │       ad_items        │  │
              │                  │──────────────────────│  │
              │                  │ id (UUID) PK         │  │
              │                  │ slot_id (FK)         │  │
              │                  │ user_id (FK users)   │  │  ← anunciante
              │                  │ img_url / link_url   │  │
              │                  │ alt_text             │  │
              │                  │ advertiser_name      │  │
              │                  │ starts_at / ends_at  │  │
              │                  │ status               │  │
              │                  │ display_order        │  │
              │                  │ created_by (FK users) │  ← admin
              │                  └──────────────────────┘  │
              ▼                                             │
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
    latitude: float | None = Field(default=None)   # Etapa 7a — geolocalización
    longitude: float | None = Field(default=None)  # Etapa 7a — geolocalización

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
    date: date                                     # día de negocio en Argentina — no se convierte
    time: time                                     # hora inicio, en UTC
    time_end: time | None = Field(default=None)    # hora fin (Etapa 4), en UTC
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
    # Etapa 8b: exclusivo del plan pro (Destacado Plus) — dest y gratis
    # nunca lo suben (ver a_revisar.md, sigue seSALE_primario.html al pie de
    # la letra). Se sube/borra vía POST/DELETE /api/events/{id}/flyer
    # (app/core/storage.py). Con Supabase configurado, guarda una URL
    # absoluta (pública). Sin Supabase (fallback de development), guarda una
    # ruta RELATIVA (`/uploads/flyers/{id}/...`) — el backend no puede saber
    # en qué origen es alcanzable públicamente (localhost, un túnel, prod).
    # El frontend la resuelve al momento de mostrarla con
    # resolveMediaUrl() (apps/web/src/lib/media.ts), anteponiendo
    # NEXT_PUBLIC_API_URL solo si no es ya absoluta.
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
único. Se recalcula cada vez que se crea o edita un evento; un evento con
horario 18:00-22:00 (hora Argentina) tiene ambos registros.

`time`/`time_end` se guardan en UTC (ver "Timezone" más abajo), pero
diurno/nocturno es una noción de horario **local**. Por eso
`_sync_event_moments` (`app/services/event_service.py`) convierte a hora
Argentina con `app.core.timezone.utc_time_to_argentina` antes de llamar a
`app.core.moment.calculate_moments(time_start, time_end)` — pasarle el
`time`/`time_end` crudo (UTC) clasificaría mal los eventos nocturnos.

```python
class EventMoment(SQLModel, table=True):
    __tablename__ = "event_moments"

    event_id: UUID = Field(foreign_key="events.id", primary_key=True)
    moment: str = Field(primary_key=True, max_length=20)  # "diurno" | "nocturno"

    event: "Event" = Relationship(back_populates="moment_links")
```

#### Timezone (Etapa 6.5)

seSALE opera en horario Argentina (`America/Argentina/Buenos_Aires`,
UTC-3, sin horario de verano). Convención:

- **`Event.date` nunca se convierte.** Representa el día de negocio en
  Argentina (para qué día es el evento) — se manda, guarda y filtra tal
  cual, tanto en el frontend como en el backend.
- **`Event.time`/`Event.time_end` se guardan en UTC.** El frontend
  convierte la hora que tipea el usuario (hora Argentina) a UTC recién al
  mandar el payload (`toUtcPayload` en `events-api.ts`, usando
  `localTimeToUtc` de `lib/date-helpers.ts`) y hace la conversión inversa
  al precargar el formulario de edición (`utcTimeToLocal`). Mostrar un
  evento (`formatEventTime`) siempre asume que lo que devuelve la API ya
  es UTC.
- **"Hoy" y "fecha no puede estar en el pasado" se calculan en hora
  Argentina, no en la del servidor.** El backend corre en UTC — comparar
  con `date.today()`/`datetime.now(timezone.utc).date()` directamente
  hace que, entre las 21:00 y las 23:59 hora Argentina, el servidor ya
  esté "un día adelantado" y rechace fechas válidas o excluya eventos del
  filtro "hoy". `app/core/timezone.py` centraliza esto
  (`argentina_today()`, usado en `schemas/event.py` y
  `services/event_service.py`); el frontend usa el equivalente
  `argentinaTodayIso()` de `lib/date-helpers.ts`.
- **El cálculo de diurno/nocturno también es hora Argentina** (ver
  `event_moments` arriba) — se convierte desde UTC antes de clasificar.

#### `locations`

Desde la Etapa 7b, un `Location` puede ser un lugar precargado (bar, teatro,
plaza, etc. cargado por el admin, con mapa) o una ubicación automática
(creada cuando un organizador tipeó dirección libre en el formulario de
evento). `is_public` distingue ambos casos.

```python
class Location(SQLModel, table=True):
    __tablename__ = "locations"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=255)              # "El Tinglado Bar"
    address: str = Field(max_length=500)           # "Av. Roca 1240"
    city_id: UUID = Field(foreign_key="cities.id")
    latitude: float | None = Field(default=None)
    longitude: float | None = Field(default=None)

    # Etapa 7b
    description: str | None = Field(default=None, max_length=1000)
    hours: str | None = Field(default=None, max_length=500)      # texto libre
    place_type: str | None = Field(default=None, max_length=50)  # texto libre, sugerido en el frontend (bar/teatro/plaza/club/restaurant/cultural/deportivo/otro)
    is_verified: bool = Field(default=False)  # el admin lo marcó como lugar oficial
    # True = lugar precargado por el admin (visible en el selector del
    # formulario de evento). False = ubicación automática creada por un
    # organizador con dirección libre — no aparece en el selector.
    is_public: bool = Field(default=False)

    # ── Etapa 8e-pre — Gastronomía ────────────────────────────────────
    # Gastronomía usa la misma tabla Location que los lugares de eventos —
    # no es una tabla nueva. Un lugar puede tener is_gastro=True Y aparecer
    # también como ubicación de un evento al mismo tiempo.
    is_gastro: bool = Field(default=False)
    # True = aparece en la sección Gastronomía. False = solo se usa como
    # ubicación de eventos.

    plan: str = Field(default="gratis")  # "gratis" | "dest" | "pro" — mismo sistema que Event.plan, solo relevante si is_gastro=True
    featured_until: datetime | None = Field(default=None)  # vencimiento del plan pago de gastronomía; None = sin fecha (gratis, o pago activado a mano)

    opening_hours: dict | None = Field(default=None, sa_column=Column(JSON, nullable=True))
    # Horarios estructurados por día de la semana. Estructura:
    # {"lunes": {"open": "09:00", "close": "22:00"}, ..., "domingo": null}
    # null en un día = cerrado ese día. `hours` (arriba, texto libre) sigue
    # existiendo en paralelo para notas complementarias como "Cerrado los
    # feriados" o "Solo con reserva" — no son redundantes.

    gastro_whatsapp: str | None = Field(default=None, max_length=50)
    gastro_instagram: str | None = Field(default=None, max_length=100)
    gastro_web: str | None = Field(default=None, max_length=500)
    gastro_email: str | None = Field(default=None, max_length=255)

    has_delivery: bool = Field(default=False)
    has_reservations: bool = Field(default=False)
    price_range: str | None = Field(default=None, max_length=5)  # "$" | "$$" | "$$$" | None (no especificado)

    cover_img_url: str | None = Field(default=None, max_length=500)
    # Foto del local (distinta al flyer de eventos). Mismo patrón de
    # almacenamiento que flyer_url: Supabase Storage en prod, disco local en dev.

    # Relaciones
    city: "City" = Relationship(back_populates="locations")
    events: list["Event"] = Relationship(back_populates="location")
    gastro_types: list["LocationGastroType"] = Relationship(back_populates="location")
```

`is_gastro=True` + al menos un `LocationGastroType` asociado es lo que hace
que un lugar aparezca en la sección Gastronomía (Etapa 8e).

#### `location_gastro_types` (Etapa 8e-pre)

Tabla intermedia — mismo patrón que `event_categories`: permite que un lugar
tenga múltiples tipos gastronómicos (ej: un café que también es bar). El
filtro por tipo en la Etapa 8e es OR: un lugar aparece si tiene al menos uno
de los tipos filtrados.

```python
class LocationGastroType(SQLModel, table=True):
    __tablename__ = "location_gastro_types"

    location_id: UUID = Field(foreign_key="locations.id", primary_key=True)
    gastro_type: str = Field(primary_key=True, max_length=50)

    location: "Location" = Relationship(back_populates="gastro_types")
```

`gastro_type` es un string libre — validado en el schema Pydantic (Etapa 8e)
contra la constante `GASTRO_TYPES` de `app/models/location_gastro_type.py`,
sin tabla maestra de tipos todavía:

```python
GASTRO_TYPES = [
    "cerveceria", "restaurante", "parrilla", "bar", "cafe",
    "pizzeria", "heladeria", "rotiseria", "vinoteca", "otro",
]
```

Cuando el admin pueda cargar tipos nuevos (etapa futura), se agrega una
tabla maestra y esta validación se relaja — ver `a_revisar.md`.

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
    approved_by: UUID | None = Field(default=None, foreign_key="users.id")  # admin que aprobó/rechazó (custom/banner/transfer)
    notes: str | None = Field(default=None)  # notas del admin al aprobar o rechazar

    # Etapa 6b-1 — pago manual con aviso de transferencia
    payment_method: str = Field(default="mercadopago")  # "mercadopago" | "transfer" | "manual"
    transfer_note: str | None = Field(default=None)     # nota del usuario al avisar la transferencia
    reviewed_at: datetime | None = Field(default=None)   # cuándo approved_by revisó (aprobó/rechazó)

    # Etapa 6b-2 — el pago es POR EVENTO, no por cuenta del organizador
    event_id: UUID | None = Field(default=None, foreign_key="events.id")

    # Relaciones
    user: "User" = Relationship(back_populates="subscriptions")
    plan: "Plan" = Relationship(back_populates="subscriptions")
    plan_price: "PlanPrice" = Relationship(back_populates="subscriptions")
    event: "Event" = Relationship()
```

> `status` incluye además `pending_approval` (Etapa 6b-1): un aviso de
> transferencia esperando revisión del admin. `approved_by`/`notes` ya
> existían desde la Etapa 6 (pensados para el plan Banner) — Etapa 6b-1 los
> reusa como reviewer/admin_notes también para el flujo de transferencia, en
> vez de duplicarlos con campos nuevos.
>
> **`event_id` (Etapa 6b-2 — corrección de arquitectura):** un plan dest/pro
> se compra PARA UN EVENTO PUNTUAL, elegido por el organizador al momento de
> pagar — no para "todos los eventos aprobados del organizador" como hacía
> el código hasta esta corrección (`_apply_plan_to_organizer_events`, que
> aplicaba el plan pagado a cada evento aprobado del organizador sin
> distinción). `event_id` es `None` únicamente para el plan Banner
> (`pricing_type=custom`, es un espacio publicitario del sitio, no el
> upgrade de un evento) y para las `Subscription` creadas antes de esta
> migración (no se puede inferir retroactivamente a qué evento
> correspondían). Ver `a_revisar.md`.

#### `ad_slots` / `ad_items` (Etapa 8d-pre)

Sistema de banners rediseñado en dos tablas para soportar el sistema
completo definido en `seSALE.html` (`BANS_HOME`/`ADS_GRID_HOME`/
`BANS_LUGARES`, `registerAndRenderSlots`, `tickBanners`). Antes de esta
etapa, `AdSlot` mezclaba "espacio" (posición fija) y "contenido" (imagen,
link, anunciante) en una sola tabla — no soportaba múltiples imágenes por
posición ni un anunciante como usuario registrado.

- **`ad_slots`** — el ESPACIO publicitario: la posición fija en la página.
  Lo crea el sistema (seed), no el admin — no cambia frecuentemente.
- **`ad_items`** — la PIEZA publicitaria: una imagen con su link y
  vigencia, cargada por el admin **para un usuario registrado**
  (`user_id`, el anunciante) y auditada con `created_by` (el admin que la
  cargó). Un `AdSlot` puede tener múltiples `AdItem` (rotan entre ellos).

**Dos secciones de banners, independientes entre sí** (un mismo anunciante
puede estar en una, en la otra, o en ambas, con `AdItem` separados):

| `section` | Dónde aparece | `slot_position` válidos | `rotation_mode` |
|---|---|---|---|
| `"eventos"` | Home, banners wide arriba del listado de eventos — 3 carruseles apilados, el admin elige en cuál carga cada banner | `0`, `1`, `2` | `"sequential"` (rota en orden cada `rotation_interval_seconds`, default 3s) |
| `"eventos-grid"` | Home, tiles cuadrados en grilla de 2 columnas debajo del listado — se pueden agregar más de 2 tiles (se acomodan de a 2 por fila) | `0`, `1`, `2`... sin límite | `"random"` (cada tile rota en orden random entre sus imágenes) |
| `"gastronomia"` | Pantalla de Gastronomía — mismos 3 carruseles wide apilados que `"eventos"`, independientes | `0`, `1`, `2` | `"sequential"` |

Categorías y tipos de gastronomía quedan para una etapa futura — no se
modelan todavía.

```python
class AdSlot(SQLModel, table=True):
    """Espacio publicitario — la posición fija en la página. Lo crea el
    sistema (seed), no el admin: no cambia frecuentemente. El contenido
    vive en AdItem."""

    __tablename__ = "ad_slots"
    __table_args__ = (
        UniqueConstraint("city_id", "section", "slot_position", name="uq_ad_slots_city_section_position"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    city_id: UUID = Field(foreign_key="cities.id", index=True)
    section: str = Field(max_length=20)              # "eventos" | "eventos-grid" | "gastronomia"
    slot_position: int = Field(default=0)             # 0-based, ver tabla arriba
    rotation_mode: str = Field(default="sequential", max_length=20)  # "sequential" | "random"
    rotation_interval_seconds: int = Field(default=3)
    is_active: bool = Field(default=True)             # si False, no se muestra aunque tenga AdItems activos
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    city: "City" = Relationship(back_populates="ad_slots")
    items: list["AdItem"] = Relationship(back_populates="slot")


class AdItem(SQLModel, table=True):
    """Pieza publicitaria — imagen + link + vigencia, cargada por el admin
    para un anunciante (usuario registrado)."""

    __tablename__ = "ad_items"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    slot_id: UUID = Field(foreign_key="ad_slots.id", index=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)   # anunciante — siempre un usuario registrado

    img_url: str = Field(max_length=500)
    link_url: str | None = Field(default=None, max_length=500)
    alt_text: str | None = Field(default=None, max_length=255)
    advertiser_name: str | None = Field(default=None, max_length=255)  # copiado de User.public_name si no se especifica

    starts_at: date = Field(default_factory=lambda: datetime.now(timezone.utc).date())  # default: día de carga
    ends_at: date | None = Field(default=None)        # None = vigente indefinidamente

    status: str = Field(default="active", max_length=20)  # "active" | "paused" | "expired" — sin "pending"
    display_order: int = Field(default=0)              # orden dentro del slot, solo con rotation_mode="sequential"

    created_by: UUID = Field(foreign_key="users.id")   # admin que cargó el banner — siempre un admin
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    slot: "AdSlot" = Relationship(back_populates="items")
    user: "User" = Relationship(back_populates="ad_items", sa_relationship_kwargs={"foreign_keys": "[AdItem.user_id]"})
    creator: "User" = Relationship(back_populates="created_ad_items", sa_relationship_kwargs={"foreign_keys": "[AdItem.created_by]"})
```

**Reglas de negocio confirmadas:**
- Solo el admin sube banners — no hay autogestión ni solicitud del
  anunciante, ni flujo de aprobación (`status="pending"` no existe: el
  admin carga y queda `"active"` directamente).
- El admin siempre elige un `user_id` existente como anunciante.
- El usuario puede **ver** sus banners (vigentes y futuros) desde su
  cuenta, pero no puede crearlos ni editarlos.

**Vencimiento automático** (`app/core/expiry.py:expire_overdue_ad_items`,
mismo patrón que `expire_overdue_subscriptions`): marca `status="expired"`
los `AdItem` con `status="active"` y `ends_at` pasado; `ends_at=None`
nunca se toca. Idempotente. Se dispara lazy como `BackgroundTask` en
`GET /api/events` (`run_expire_overdue_ad_items_task`), junto al de
`Subscription`.

**Esta etapa (8d-pre) es solo modelo y migración** — sin endpoints ni
frontend. Ver `a_revisar.md` (sección Etapa 8d-pre) por lo que queda
pendiente para la Etapa 8d: validación de `section` en schemas Pydantic,
subida real de imagen a Supabase Storage, y `GET /api/users/me/banners`.

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

### Flujo de pago de plan (MercadoPago) — Etapa 6 ✓ implementado, corregido en 6b-2

> **El pago es por evento, no por cuenta.** Hasta la Etapa 6b-2, pagar un
> plan aplicaba `Event.plan`/`featured_until` a **todos** los eventos
> aprobados del organizador (`_apply_plan_to_organizer_events`). Se corrigió
> a pedido del usuario: ahora el organizador elige QUÉ evento destacar al
> momento de pagar, y solo ese evento se actualiza (`_apply_plan_to_event`).
> `_apply_plan_to_organizer_events` se mantiene únicamente para el plan
> Banner (`activate_subscription_manually`), que no es un upgrade de un
> evento puntual.

```
Usuario ve /eventos/{id} (dueño, plan="gratis") → botón "Elegir plan"
        │
        ▼
  /planes?event_id={id} — requiere event_id en la URL; sin él, pide elegir
  un evento desde /mis-eventos (un plan no se compra "para la cuenta")
        │
        ▼
  Plan gratis → botón deshabilitado "Tu plan actual"
  Plan banner → botón "Consultar" → abre WhatsApp (SESALE_WHATSAPP), sin pasar por MP
  Plan dest/pro → botón "Contratar con MercadoPago" o "Ya realicé una
  transferencia bancaria" (Etapa 6b-1, flujo alternativo)
        │
        ▼
  POST /api/subscriptions/checkout { plan_id, event_id }
        │
        ▼
  Backend valida que el plan sea fixed (no gratis/banner), que el evento
  exista y pertenezca al usuario (o sea admin), obtiene el PlanPrice
  vigente, crea la preferencia en MercadoPago API (SDK oficial, ACCESS_TOKEN
  solo en el backend) y guarda una Subscription status="pending_payment"
  con mp_payment_id=preference_id y event_id=el evento elegido
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
        │              actualiza Event.plan/Event.featured_until de
        │              ÚNICAMENTE el evento de subscription.event_id
        │
        └── rejected/cancelled → Subscription.status="cancelled"
        │
        ▼
  Responde 200 a MP siempre (salvo firma inválida)

Vencimiento (app/core/expiry.py, expire_overdue_subscriptions — Etapa 8c,
antes expire_subscriptions en payment_service.py): marca status="expired"
las Subscription vencidas (expires_at < ahora), completa reviewed_at, y
revierte a plan="gratis" el evento de subscription.event_id (o, si no
tiene event_id —Subscription previa a 6b-2 o del plan Banner—, todos los
eventos del organizador con ese plan, criterio anterior). Idempotente:
correrla dos veces seguidas no cambia nada la segunda vez. Dos formas de
dispararla, misma función:
  - Manual: POST /api/admin/subscriptions/expire (admin).
  - Lazy (Etapa 8c, sin scheduler todavía): GET /api/events la agenda
    como BackgroundTask (run_expire_overdue_subscriptions_task) — corre
    después de enviada la respuesta, con su propia sesión de DB, y nunca
    propaga errores (solo loguea) porque el cliente ya recibió su
    respuesta.

Plan Banner (pricing_type=custom): no pasa por MP, no tiene event_id (no es
el upgrade de un evento sino un espacio publicitario del sitio). El admin
carga la Subscription y la activa manualmente con
PATCH /api/admin/subscriptions/{id}/activate, mismo efecto que el
webhook aprobado (sigue aplicando a todos los eventos aprobados del
organizador — `_apply_plan_to_organizer_events`, sin cambios).
```

### Flujo de pago manual con aviso de transferencia (Etapa 6b-1)

Alternativa independiente al checkout de MercadoPago (que tiene un bug de
credenciales pendiente de resolver en la Etapa 6b-2) — conviven en la
pantalla `/planes`, sin tocarse entre sí. **No hay subida de comprobante
todavía**: el usuario avisa que transfirió y manda el comprobante por fuera
del sistema (WhatsApp); ver `a_revisar.md` para el porqué y qué falta si se
agrega upload real en el futuro.

```
Usuario ve /planes?event_id={id} → plan dest/pro → además de "Contratar con
MercadoPago", ve "Ya realicé una transferencia bancaria"
        │
        ▼
  /planes/transferencia?plan_id={id}&event_id={id}: datos bancarios
  (NEXT_PUBLIC_BANK_INFO, con botón copiar), botón WhatsApp con mensaje
  prellenado, nota opcional, botón "Ya envié el comprobante"
        │
        ▼
  POST /api/subscriptions/transfer { plan_id, event_id, note? }
        │
        ▼
  Backend valida el plan (fixed, no gratis/banner) y que el evento exista y
  pertenezca al usuario (o sea admin), toma el PlanPrice vigente, crea
  Subscription status="pending_approval" payment_method="transfer"
  event_id=el evento elegido (sin cobrar nada) y notifica al admin por
  email (Resend, best-effort)
        │
        ▼
  Frontend navega a /planes/transferencia/enviado ("Ver mis eventos",
  "Contactar por WhatsApp"). Mientras tanto, en /mi-cuenta el usuario ve un
  banner "Tu comprobante de pago está siendo revisado" (por evento — puede
  haber varios simultáneos, uno por cada evento con un aviso pendiente) y
  en el propio evento (`GET /api/events/{id}` → organizer_subscription) ve
  el mismo estado, visible solo para él o un admin
        │
        ▼
  Admin revisa el comprobante fuera del sistema (WhatsApp/mail) — lo ve
  tanto en el panel Suscripciones como en el listado de Eventos pendientes
  de aprobar (organizer_subscription por evento, no por cuenta) y hace
  "Aprobar" o "Rechazar"
        │
        ▼
  PATCH /api/admin/subscriptions/{id}/review { action, admin_notes? }
        │
        ├── approve → status="active", starts_at=ahora, expires_at=+30 días,
        │   aplica el plan ÚNICAMENTE al evento de subscription.event_id
        │   (misma función que usa el webhook de MP), email de confirmación
        │
        └── reject → status="cancelled", evento sin tocar, email de
            rechazo (con el motivo, si el admin lo cargó)
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

### Vista de Mapa (Etapa 7b, Home — Etapa 8c)

- **Leaflet** (vanilla, sin `react-leaflet`) renderiza el mapa —
  `components/MapPicker.tsx`, siempre importado con `dynamic(..., {ssr:
  false})` porque Leaflet usa `window`. Tiles de **OpenStreetMap**
  (`{s}.tile.openstreetmap.org`, gratis, sin API key).
- **Nominatim** (OpenStreetMap) resuelve geocoding (`searchAddress`) y
  reverse geocoding (`reverseGeocode`) — `lib/nominatim.ts`. Gratis, sin
  API key, con rate limit de 1 request/segundo respetado con un debounce
  de 1000ms en el input de búsqueda del mapa (y 300ms en el buscador de
  lugares precargados, que pega contra `/api/locations`, no Nominatim).
  Siempre manda `countrycodes=ar`.
- `MapPicker` se reusa en tres lugares: formulario de evento (Tab
  "Indicar en el mapa", interactivo), `EventDetailView.tsx` (readonly, si
  el lugar tiene coordenadas) y el ABM de lugares del panel admin
  (interactivo).
- **El tab "Mapa" del Home (Etapa 8c)** ya no es un placeholder:
  `components/EventsMap.tsx` (dynamic import `ssr: false`, igual patrón
  que `MapPicker`) renderiza un pin por cada evento del listado actual —
  comparte exactamente los mismos filtros que `GET /api/events` (ciudad,
  categoría, momento, fechas, búsqueda), recibidos como prop `events`
  desde `app/page.tsx` (mismo `useEvents`/`queryKey` que usa `EventList`,
  sin duplicar el fetch gracias al cache de TanStack Query). Es un
  componente **nuevo**, no una extensión de `MapPicker` — `MapPicker` solo
  soporta un marker único, interactivo; `EventsMap` soporta N markers de
  solo lectura. Coordenadas: se leen de `event.location.latitude/longitude`
  (ya expuestas ahí desde la Etapa 7b, sin campos nuevos en `EventRead`);
  un evento sin coordenadas simplemente no pinta pin, sin error. Pin
  `L.divIcon` con color/tamaño según `event.plan` (`pro` fucsia grande,
  `dest` fucsia claro mediano, `gratis` gris chico), popup con
  título/fecha-hora/lugar/link "Ver evento" (navega a `/eventos/{id}`),
  leyenda fija y botón "Cerca mío" (usa `requestUserLocation()` de
  `lib/city-detection.ts`, sin persistir en localStorage — solo centra el
  mapa).

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
                                       body admite city_id opcional             ✓ Etapa 7a
                                       (ciudad del evento, elegida por el
                                       organizador; default = ciudad del
                                       organizador). 404 si no existe, 422 si
                                       no está is_active
                                       body: location_id | location_data        ✓ Etapa 7b
                                       (uno de los dos, nunca ninguno).
                                       location_id: usa un Location existente
                                       (lugar precargado del admin, o creado
                                       antes). location_data: { name?, address,
                                       city_id, latitude?, longitude? } — crea
                                       un Location nuevo con is_public=False
                                       (dirección libre + mapa, Tab "Indicar en
                                       el mapa" del formulario). Si vienen los
                                       dos, se usa location_id. Si no viene
                                       ninguno, 422. location_data.city_id debe
                                       coincidir con la ciudad efectiva del
                                       evento — 422 si no coincide ✓ Etapa 8a
                                       contact_whatsapp: si no viene en el
                                       payload (o viene vacío), se completa
                                       automáticamente con el public_whatsapp
                                       del perfil del organizador ✓ Etapa 8a
PUT    /api/events/{id}                Editar evento propio (user) o cualquiera  ✓ Etapa 4
                                       (admin). Si edita el organizador, status
                                       vuelve a pending; si edita el admin, no
                                       cambia. 403 para cualquier otro usuario.
                                       city_id opcional (Etapa 7a) — cambia la
                                       ciudad del evento (misma validación que
                                       POST); ausente = no se toca.
                                       location_id | location_data opcionales   ✓ Etapa 7b
                                       (mismo formato que POST); ambos ausentes
                                       = no se toca la ubicación actual.
                                       location_data.city_id se valida contra
                                       la ciudad efectiva del evento, igual que
                                       en POST ✓ Etapa 8a
                                       contact_whatsapp: si el payload no lo
                                       manda (o lo manda null), NO se pisa el
                                       valor existente del evento — es un dato
                                       del perfil del organizador, no algo que
                                       se edita por evento hoy ✓ Etapa 8a
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
POST   /api/events/{id}/flyer          Sube/reemplaza el flyer del evento     ✓ Etapa 8b
                                       (multipart/form-data, campo "file").
                                       Organizador dueño o admin — 403 si no,
                                       404 si el evento no existe. Exclusivo
                                       del plan pro (Destacado Plus) — 400 si
                                       el plan es gratis o dest (ver
                                       a_revisar.md, sigue
                                       seSALE_primario.html). 422 si el
                                       archivo no es JPG/PNG/WEBP o supera
                                       5MB. Si ya había un flyer, se
                                       reemplaza en el storage (no quedan
                                       archivos huérfanos). Devuelve
                                       { flyer_url } — relativo en dev sin
                                       Supabase, el frontend lo resuelve con
                                       resolveMediaUrl() (lib/media.ts)
DELETE /api/events/{id}/flyer          Elimina el flyer del evento            ✓ Etapa 8b
                                       Organizador dueño o admin — 403 si no,
                                       404 si el evento no existe. Borra el
                                       archivo del storage y pone
                                       flyer_url=null. Devuelve { flyer_url }
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
                                       CityRead incluye latitude/longitude      ✓ Etapa 7a
                                       (para calcular la ciudad más cercana al
                                       usuario en el frontend, ver lib/city-
                                       detection.ts)
GET    /api/cities/{id}                Detalle de ciudad (público)                planificado
POST   /api/cities                     Crear ciudad (admin)                       planificado
PATCH  /api/cities/{id}/toggle         Habilitar / deshabilitar ciudad (admin)    ✓ Etapa 8a
                                       Sin body. Alterna is_active. Habilitar
                                       (False→True) siempre se permite.
                                       Deshabilitar (True→False) se rechaza
                                       con 409 si la ciudad tiene eventos
                                       approved + is_active=True + date >= hoy
                                       ("Esta ciudad tiene N evento(s)
                                       activo(s). Desactivá o reasigná los
                                       eventos antes de deshabilitar la
                                       ciudad."). 404 si no existe
```

### Ciudades — administración (`/api/admin`) ✓ Etapa 8a

Todas requieren rol `admin` (401 sin auth, 403 para `user`).

```
GET    /api/admin/cities               Todas las ciudades (activas e
                                       inactivas), con active_events_count
                                       (mismo criterio que la restricción del
                                       toggle) — contexto para el admin antes
                                       de deshabilitar. Orden: sort_order
PATCH  /api/admin/cities/{id}/sort-order  Body: { sort_order: int >= 0 }.
                                       Actualiza el orden del selector.
                                       404 si no existe
```

### Ubicaciones (`/api/locations`) ✓ Etapa 7b
```
GET    /api/locations                  Público. Requiere city_id. Filtros:
                                       search (name/address), place_type.
                                       Solo is_public=True. Orden:
                                       is_verified=True primero, luego name ASC
GET    /api/locations/{id}             Público. Cualquier Location (público o
                                       no) — para mostrar la ubicación de un
                                       evento aunque no sea un lugar precargado.
                                       404 si no existe
```

### Ubicaciones — administración (`/api/admin`) ✓ Etapa 7b

Todas requieren rol `admin` (401 sin auth, 403 para `user`).

```
GET    /api/admin/locations            Todos los locations (públicos y
                                       privados). Filtros: city_id, is_public,
                                       is_verified, place_type, search.
                                       Paginación: limit (default 50) / offset.
                                       Orden: is_public primero, luego
                                       is_verified, luego name ASC. Incluye
                                       event_count (cantidad de eventos
                                       asociados)
POST   /api/admin/locations            Crea un lugar precargado. is_public se
                                       fuerza a True en el backend. Body:
                                       { name, address, city_id, description?,
                                       hours?, place_type?, latitude?,
                                       longitude?, is_verified? }
PUT    /api/admin/locations/{id}       Edita cualquier campo, incluido
                                       is_public — permite "promover" una
                                       ubicación automática a lugar oficial
PATCH  /api/admin/locations/{id}/verify  Alterna is_verified. Body:
                                       { is_verified: bool }
DELETE /api/admin/locations/{id}       409 si tiene eventos asociados (mensaje
                                       con la cantidad); si no, elimina
                                       físicamente
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
POST   /api/subscriptions/checkout     User o admin autenticado. Body:
                                       { plan_id, event_id }. Etapa 6b-2: event_id
                                       obligatorio — el evento a destacar, elegido
                                       por el organizador al momento de pagar. 404
                                       si el evento no existe o no le pertenece (ni
                                       es admin), 400 si el plan es gratis o banner
                                       (no pasan por MP) o si no tiene precio
                                       vigente. Crea la preferencia en MercadoPago y
                                       una Subscription pending_payment con ese
                                       event_id. Devuelve { init_point }
GET    /api/subscriptions/me           Autenticado. Lista las Subscription propias
                                       (plan, status, fechas, monto pagado, promo,
                                       event_id/event_title del evento destacado)
POST   /api/subscriptions/transfer     ✓ Etapa 6b-1, event_id obligatorio desde
                                       6b-2. User o admin autenticado. Body:
                                       { plan_id, event_id, note? }. 404 si el plan
                                       o el evento no existen o el evento no le
                                       pertenece (ni es admin), 400 si el plan es
                                       gratis o custom (banner, no admite
                                       transferencia). Crea una Subscription
                                       status="pending_approval",
                                       payment_method="transfer", event_id=el
                                       evento elegido, sin cobrar nada — el
                                       comprobante se manda por fuera del sistema
                                       (WhatsApp/mail, ver flujo abajo). Notifica al
                                       admin por email (Resend, best-effort)
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
PATCH  /api/admin/subscriptions/{id}/review    ✓ Etapa 6b-1. Admin. Body:
                                              { action: "approve"|"reject",
                                              admin_notes? }. 404 si no existe,
                                              409 si status != pending_approval.
                                              approve: status="active",
                                              starts_at=ahora, expires_at=+30 días,
                                              approved_by/reviewed_at/notes
                                              completados, aplica el plan
                                              ÚNICAMENTE al evento de
                                              subscription.event_id (misma lógica
                                              que el webhook de MP, Etapa 6b-2) y
                                              envía email de confirmación. reject: status=
                                              "cancelled", no toca eventos, envía
                                              email de rechazo con el motivo
```

### Reportes — administración (`/api/admin`) ✓ Etapa 6.5
```
GET    /api/admin/reports              Admin. Filtros: status, event_id,
                                       date_from, date_to. Orden: created_at
                                       DESC. Incluye event_title (join con Event)
PATCH  /api/admin/reports/{id}/status  Admin. Body: { status: "reviewed"|"dismissed" }
```

### Banners (`/api/ads`, `/api/admin`) ✓ Etapa 8d
```
GET    /api/ads                          Público. Params: city_id (requerido),
                                         section (requerido, "eventos" |
                                         "eventos-grid" | "gastronomia").
                                         AdSlot de esa ciudad/sección con sus
                                         AdItem vigentes anidados (status=active
                                         y starts_at<=hoy<=ends_at o ends_at=None),
                                         ordenados por display_order ASC. Slots
                                         sin items vigentes igual se incluyen
                                         (items=[]). Dispara expire_overdue_ad_items
                                         lazy (BackgroundTask), igual que GET /api/events

GET    /api/admin/ad-slots               Admin. Params: city_id (requerido),
                                         section (opcional). TODOS los AdItem
                                         del slot (activos/pausados/vencidos)

GET    /api/admin/ad-items               Admin. Filtros: city_id, section,
                                         status, user_id, date_from, date_to.
                                         Orden: created_at DESC

POST   /api/admin/ad-items               Admin. Crea un AdItem para un
                                         user_id (anunciante) existente.
                                         advertiser_name se copia de
                                         User.public_name si no se especifica.
                                         created_by = admin autenticado

PUT    /api/admin/ad-items/{id}          Admin. Edita cualquier campo salvo
                                         slot_id/user_id (no cambian tras crear)

DELETE /api/admin/ad-items/{id}          Admin. Elimina el AdItem y, si
                                         corresponde, el archivo del storage
                                         (ver delete_banner_if_owned — no
                                         borra imágenes externas pegadas por URL)

PATCH  /api/admin/ad-items/{id}/status   Admin. Body: {status:"active"|"paused"}.
                                         Nunca "expired" (400) — eso lo hace
                                         expire_overdue_ad_items automáticamente

POST   /api/admin/ad-items/{id}/image    Admin. multipart/form-data. JPG/PNG/
                                         WEBP/GIF, máx. 2MB (banners pueden ser
                                         animados). Supabase Storage (bucket
                                         SUPABASE_BANNER_BUCKET) o disco local
                                         en dev — mismo patrón que el flyer

PATCH  /api/admin/ad-items/reorder       Admin. Body: {slot_id, ordered_ids[]}.
                                         Solo slots rotation_mode="sequential"
                                         (400 en "random")

GET    /api/users/me/banners             Usuario autenticado. Sus propios
                                         AdItem (vigentes y futuros), con
                                         section/slot_position de su AdSlot.
                                         Orden: starts_at DESC. Solo lectura
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
| **6b-1** | Flujo de pago manual con aviso de transferencia y confirmación admin — alternativa independiente al checkout de MercadoPago (bug de credenciales pendiente). | ✓ Completa: `SubscriptionStatus.pending_approval`, `payment_method`/`transfer_note`/`reviewed_at` en `Subscription` (migración `0009`, reusa `approved_by`/`notes` como reviewer/admin_notes), `POST /api/subscriptions/transfer`, `PATCH /api/admin/subscriptions/{id}/review`, pantallas `/planes/transferencia` y `/planes/transferencia/enviado`, panel admin actualizado (pending_approval primero, badge de método de pago, aprobar/rechazar). Sin subida de comprobante todavía — ver `a_revisar.md` |
| **6b-1 (fixes post-QA)** | Correcciones encontradas probando la 6b-1: admin sin acceso a eventos `pending`/`rejected`, caché del frontend mostrando datos viejos, y visibilidad del estado de pago en el contexto del evento (no solo en la pestaña Suscripciones). | ✓ Completa: `get_event_detail` permite admin en eventos no-públicos (antes 404 salvo el dueño); `staleTime: 0` en `useMySubscriptions`/`useAdminSubscriptions` (bug de caché real: TanStack Query servía respuestas de hasta 60s de antigüedad); link "Ver detalle" en panel admin de eventos; `organizer_subscription` agregado a `EventDetailRead`/`AdminEventRead` |
| **6b-2** | Corrección de arquitectura (a pedido del usuario, detectada probando la 6b-1): el pago de un plan es **por evento**, no por cuenta del organizador. | ✓ Completa: `Subscription.event_id` (FK a `events`, migración `0010`), `_apply_plan_to_event()` reemplaza a `_apply_plan_to_organizer_events()` para dest/pro (se mantiene solo para el plan Banner, que no es un upgrade de un evento puntual); `POST /api/subscriptions/checkout` y `POST /api/subscriptions/transfer` requieren `event_id`; `/planes` requiere `?event_id=` (si falta, pide elegir un evento desde `/mis-eventos`); `expire_subscriptions` revierte solo el evento vinculado; `organizer_subscription` pasó a buscarse por `event_id` (antes por `organizer_id`, lo que mezclaba el pago de un evento con cualquier otro evento no relacionado del mismo organizador — el bug real que disparó esta corrección) |
| **7a** | Multi-ciudad: selector de ciudad en navbar con geolocalización automática, filtrado del home por ciudad activa, ciudad del organizador en formulario de evento. | ✓ Completa: `City.latitude`/`longitude` (migración `0011`), `CityRead` los expone; `EventCreate`/`EventUpdate.city_id` opcional (default: ciudad del organizador, valida `is_active`); `lib/city-detection.ts` (Haversine, detección por GPS con localStorage), `ActiveCityProvider`/`useActiveCity()` (Context, no Zustand), selector real en `Navbar.tsx`, `GET /api/events?city_id=` conectado al home, selector de ciudad en `EventForm.tsx`. Admin habilitar/deshabilitar ciudades queda para una etapa futura (hoy se gestiona por seed/DB directa) |
| **7b** | Lugares precargados con mapa: `Location.description`/`hours`/`place_type`/`is_verified`/`is_public`, mapa (Leaflet + OSM + Nominatim) en formulario de evento y vista detalle, ABM de lugares para admin. | ✓ Completa: migración `0012`; `GET /api/locations` (público, solo `is_public=True`) y `GET /api/locations/{id}` (cualquiera); ABM completo bajo `/api/admin/locations`; `EventCreate`/`EventUpdate` reemplazan `location_name`/`location_address` por `location_id \| location_data` (uno de los dos); `components/MapPicker.tsx` (Leaflet vanilla, dynamic import ssr:false), `lib/nominatim.ts`, `features/locations/` (selector Tab A), `EventLocationField.tsx` (dos tabs en `EventForm.tsx`), mapa readonly + description/hours en `EventDetailView.tsx`, `AdminLocationsPanel.tsx` (listado, ABM, verificar, "hacer público"), lugares precargados en `seed.py`. Ver `a_revisar.md` por el refactor de `location_name`/`location_address` a `location_id`/`location_data` (no estaba en el modelo original de esta etapa) |
| **8a** | Fixes y pendientes de `a_revisar.md`: build de producción (Suspense en `/planes` y `/planes/transferencia*`), toggle de ciudades para admin, WhatsApp del organizador auto-completado en eventos, validación cruzada de `city_id` en `location_data`, organizer_id en `EventRead`. | ✓ Completa: `PATCH /api/cities/{id}/toggle` (409 si tiene eventos aprobados/activos/futuros), `GET /api/admin/cities` + `PATCH /api/admin/cities/{id}/sort-order`, `AdminCitiesPanel.tsx`; `create_event` completa `contact_whatsapp` desde `organizer.public_whatsapp` si no viene explícito, `update_event` no lo pisa si el payload no lo manda o lo manda `null`; `_resolve_event_location` valida `location_data.city_id` contra la ciudad efectiva del evento (422 si no coincide); `organizer_id` en `EventRead` ya estaba resuelto desde la Etapa 4.5 (confirmado, sin cambios) |
| **8b** | Nuevo diseño visual (`seSALE_primario.html`), flyer por plan con Supabase Storage, lightbox en detalle del evento. | ✓ Completa: patrón de puntos del navbar, tab "Gastronomía" del bottom nav habilitado (`/lugares`, placeholder), swap "¿Qué hay hoy?"/"Ahora" en `TodayBanner.tsx` según la hora, `aspect-ratio` de `AdSlots.tsx` ajustado al diseño; `POST`/`DELETE /api/events/{id}/flyer` (`app/core/storage.py`, Supabase Storage en prod / disco local en dev, `supabase` + `python-multipart` agregados), flyer exclusivo del plan `pro` (confirmado con el usuario — dest y gratis no lo tienen, a diferencia del pedido original, ver `a_revisar.md`); `FlyerUpload.tsx` (solo en `/eventos/{id}/editar`, no en `/planes` — el evento recién es `pro` después de pagar) e `ImageLightbox.tsx` en `EventDetailView.tsx` |
| **8c** | Mapa del home con pins de eventos reales (Leaflet + filtros compartidos) y vencimiento automático lazy de destacados. | ✓ Completa: `EventsMap.tsx` reemplaza a `MapPlaceholder.tsx` (dynamic import, un pin `L.divIcon` por evento con coordenadas, color/tamaño por plan, popup, leyenda, botón "Cerca mío"), sin cambios de schema/backend (usa `event.location.latitude/longitude/name`, ya expuestos desde la Etapa 7b); `expire_subscriptions` se movió y renombró a `expire_overdue_subscriptions` en `app/core/expiry.py`, se le agregó `reviewed_at`, y se dispara tanto manual (`POST /api/admin/subscriptions/expire`) como lazy vía `BackgroundTasks` en `GET /api/events`; banner de vencimiento (ámbar ≤7 días, rojo si ya venció) en `EventDetailView.tsx` para el organizador dueño |
| **8d-pre** | Rediseño del modelo AdSlot en dos tablas (AdSlot + AdItem) para soportar banners por sección (Eventos/Gastronomía), carruseles con rotación secuencial y random, vigencia automática y anunciantes como usuarios | ✓ Completa: `ad_slots` pasa a modelar solo el espacio (`section`/`slot_position`/`rotation_mode`/`rotation_interval_seconds` + `UniqueConstraint(city_id, section, slot_position)`); tabla nueva `ad_items` (contenido: imagen/link/vigencia/anunciante/auditoría), migración `0013` (mapea in-place los 3 `ad_slots` de seed existentes `home-N` → `section="eventos"`); `expire_overdue_ad_items` + disparo lazy en `GET /api/events` (mismo patrón que `expire_overdue_subscriptions`); seed con 8 `AdSlot` por ciudad (General Roca y Cipolletti). Solo modelo/migración — sin endpoints ni frontend, ver `a_revisar.md` |
| **8d** | Banners completos: endpoints públicos/admin, ABM de banners en el panel admin, carruseles reales en el home/gastronomía, "Mis banners" en Mi cuenta. | ✓ Completa: `GET /api/ads` (público); `GET /api/admin/ad-slots`, `GET/POST/PUT/DELETE /api/admin/ad-items`, `PATCH .../status`, `POST .../image` (Supabase/disco local, GIF permitido, 2MB), `PATCH .../reorder`; `GET /api/users/me/banners`; schemas Pydantic con `Literal` para `section`/`rotation_mode`/`status` (resuelve el pendiente de 8d-pre); `components/BannerSlot.tsx` (rotación sequential/random, estado vacío punteado, click abre `link_url`), `hooks/useBannerSlots.ts` (TanStack Query), `features/ads/` (types/services/hooks/schemas/componentes admin), `AdSlots.tsx` con datos reales (antes placeholder), banners de gastronomía en `/lugares`, tab "Banners" en `/admin` (`AdminAdsPanel.tsx`, drag-and-drop nativo HTML5 para reordenar slots secuenciales), sección "Mis banners" en `/mi-cuenta` (solo lectura). Ver `a_revisar.md` por el gap encontrado (`AdItemWithSlotRead`, section/slot_position no estaban en `AdItemAdminRead`) |
| **8d (fixes post-QA)** | Correcciones encontradas probando la 8d apenas cerrada: imágenes de banner subidas como archivo no se veían, y los tiles del grid quedaban pegados a los carruseles wide en vez de ir después del listado de eventos. | ✓ Completa: `img_url` se resuelve con `resolveMediaUrl()` (mismo bug que el flyer en la Etapa 8b, ver `lib/media.ts`) en todos los `<img>` que la renderizan (`BannerSlot.tsx`, `AdSlotCard.tsx`, `MyBannersSection.tsx`, preview de `AdItemFormModal.tsx`) — el dato guardado en la DB ya era correcto, solo faltaba resolverlo al mostrar, así que los banners existentes no necesitan volver a subirse; `AdSlots.tsx` se separó en `AdSlots` (3 carruseles wide, misma posición) y `AdSlotsGrid` (tiles), este último movido en `app/page.tsx` a después de `<EventList />` |
| **8** | Espacios publicitarios (banners): CRUD de `ad_slots`/`ad_items` desde admin, render en frontend. | ✓ Completa — ver 8d-pre y 8d arriba |
| **8e-pre** | Extensión del modelo Location para Gastronomía: campos gastronómicos, horarios estructurados, tabla location_gastro_types con tipos múltiples | ✓ Completa: Gastronomía reusa `locations` (no es tabla nueva) — `is_gastro`/`plan`/`featured_until` (mismo sistema de planes que `Event`), `opening_hours` (JSON por día, convive con `hours` texto libre), contacto (`gastro_whatsapp`/`gastro_instagram`/`gastro_web`/`gastro_email`), características (`has_delivery`/`has_reservations`/`price_range`), `cover_img_url`; tabla nueva `location_gastro_types` (PK compuesta `location_id`+`gastro_type`, igual patrón que `event_categories`, filtro OR); migración `0014`; seed con 5 lugares gastro de prueba en General Roca ("El Tinglado Bar" existente se actualiza in-place, no se duplica). Solo modelo/migración/seed — sin endpoints ni frontend, ver `a_revisar.md` |
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
NEXT_PUBLIC_BANK_INFO=                          # Etapa 6b-1 — datos bancarios para /planes/transferencia
                                                 # formato "Label:valor|Label:valor", ej:
                                                 # "Alias:sesale.pagos|CBU:000...|Titular:seSALE SRL|Banco:..."
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
