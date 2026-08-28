import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

MIN_GASTRO_TYPES = 1
MAX_GASTRO_TYPES = 5

VALID_PRICE_RANGES = {"$", "$$", "$$$"}

WEEKDAYS = {"lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"}

_HOUR_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def _validate_opening_hours(value: dict | None) -> dict | None:
    if value is None:
        return value
    unknown = set(value.keys()) - WEEKDAYS
    if unknown:
        raise ValueError(f"Día inválido en opening_hours: {sorted(unknown)[0]}")
    for day, hours in value.items():
        if hours is None:
            continue
        if not isinstance(hours, dict) or set(hours.keys()) != {"open", "close"}:
            raise ValueError(f"opening_hours.{day} debe ser null o {{'open','close'}}")
        for key in ("open", "close"):
            if not isinstance(hours[key], str) or not _HOUR_RE.match(hours[key]):
                raise ValueError(f"opening_hours.{day}.{key} debe tener formato HH:MM")
    return value


def _validate_gastro_types(value: list[str]) -> list[str]:
    """Solo valida forma (sin duplicados). La pertenencia a tipos activos
    (antes, la constante GASTRO_TYPES hardcodeada) se valida en
    app.services.location_service (create_gastro_place/update_gastro_place)
    contra la tabla gastro_types_catalog — Etapa 12a: requiere la sesión de
    DB, que un field_validator de Pydantic no tiene."""
    if len(value) != len(set(value)):
        raise ValueError("No se pueden repetir tipos gastronómicos")
    return value


class LocationRead(BaseModel):
    """Lugar precargado, público — usado por el selector del formulario de evento."""

    id: UUID
    name: str
    address: str
    description: str | None
    hours: str | None
    place_type: str | None
    city_id: UUID
    city_name: str
    latitude: float | None
    longitude: float | None
    is_verified: bool
    is_public: bool

    model_config = ConfigDict(from_attributes=True)


class LocationAdminRead(LocationRead):
    """Extiende LocationRead con la cantidad de eventos asociados — solo admin."""

    event_count: int


class LocationCreate(BaseModel):
    """Ubicación creada por un organizador con dirección libre (Tab B del
    formulario de evento) — nace con is_public=False, no aparece en el
    selector de lugares precargados."""

    name: str | None = Field(default=None, max_length=255)
    address: str = Field(min_length=1, max_length=500)
    city_id: UUID
    latitude: float | None = None
    longitude: float | None = None


class LocationAdminCreate(BaseModel):
    """Alta de un lugar precargado desde el panel admin — is_public se fuerza
    a True en el servicio, no se puede setear desde acá."""

    name: str = Field(min_length=1, max_length=255)
    address: str = Field(min_length=1, max_length=500)
    city_id: UUID
    description: str | None = Field(default=None, max_length=1000)
    hours: str | None = Field(default=None, max_length=500)
    place_type: str | None = Field(default=None, max_length=50)
    latitude: float | None = None
    longitude: float | None = None
    is_verified: bool = False


class LocationAdminUpdate(BaseModel):
    """Edición de cualquier campo de un Location, incluido is_public — así el
    admin puede "promover" una ubicación automática a lugar oficial."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    address: str | None = Field(default=None, min_length=1, max_length=500)
    city_id: UUID | None = None
    description: str | None = Field(default=None, max_length=1000)
    hours: str | None = Field(default=None, max_length=500)
    place_type: str | None = Field(default=None, max_length=50)
    latitude: float | None = None
    longitude: float | None = None
    is_verified: bool | None = None
    is_public: bool | None = None


class LocationVerifyUpdate(BaseModel):
    is_verified: bool


# ── Etapa 8e — Gastronomía ──────────────────────────────────────────────────


class LocationGastroRead(BaseModel):
    """Vista pública de un lugar gastronómico — GET /api/gastro, GET /api/gastro/{id}."""

    id: UUID
    name: str
    address: str
    city_id: UUID
    city_name: str
    latitude: float | None
    longitude: float | None
    description: str | None
    hours: str | None
    opening_hours: dict | None
    gastro_types: list[str]
    gastro_whatsapp: str | None
    gastro_instagram: str | None
    gastro_web: str | None
    gastro_email: str | None
    has_delivery: bool
    has_reservations: bool
    price_range: str | None
    cover_img_url: str | None
    plan: str
    is_verified: bool
    event_count: int

    model_config = ConfigDict(from_attributes=True)


class LocationGastroAdminRead(LocationGastroRead):
    """Extiende LocationGastroRead con los campos que solo ve el admin."""

    is_active: bool
    is_gastro: bool
    is_public: bool
    featured_until: datetime | None
    place_type: str | None
    created_at: datetime


class LocationGastroCreate(BaseModel):
    """Alta de un lugar gastronómico desde el panel admin. is_gastro se fuerza
    a True y plan se fuerza a "gratis" en el servicio — no se pueden setear
    desde acá."""

    name: str = Field(min_length=1, max_length=255)
    address: str = Field(min_length=1, max_length=500)
    city_id: UUID
    gastro_types: list[str] = Field(min_length=MIN_GASTRO_TYPES, max_length=MAX_GASTRO_TYPES)
    description: str | None = Field(default=None, max_length=1000)
    hours: str | None = Field(default=None, max_length=500)
    opening_hours: dict | None = None
    gastro_whatsapp: str | None = Field(default=None, max_length=50)
    gastro_instagram: str | None = Field(default=None, max_length=100)
    gastro_web: str | None = Field(default=None, max_length=500)
    gastro_email: str | None = Field(default=None, max_length=255)
    has_delivery: bool = False
    has_reservations: bool = False
    price_range: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    is_verified: bool = False

    @field_validator("gastro_types")
    @classmethod
    def validate_gastro_types(cls, value: list[str]) -> list[str]:
        return _validate_gastro_types(value)

    @field_validator("price_range")
    @classmethod
    def validate_price_range(cls, value: str | None) -> str | None:
        if value is not None and value not in VALID_PRICE_RANGES:
            raise ValueError("price_range debe ser '$', '$$', '$$$' o null")
        return value

    @field_validator("opening_hours")
    @classmethod
    def validate_opening_hours(cls, value: dict | None) -> dict | None:
        return _validate_opening_hours(value)


class LocationGastroUpdate(BaseModel):
    """Edición de un lugar gastronómico. Todos los campos opcionales.
    gastro_types, si viene, reemplaza completo la lista existente (replace
    total, igual que event_categories). is_gastro no se puede cambiar desde
    acá — hay un endpoint separado para eso."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    address: str | None = Field(default=None, min_length=1, max_length=500)
    city_id: UUID | None = None
    gastro_types: list[str] | None = Field(
        default=None, min_length=MIN_GASTRO_TYPES, max_length=MAX_GASTRO_TYPES
    )
    description: str | None = Field(default=None, max_length=1000)
    hours: str | None = Field(default=None, max_length=500)
    opening_hours: dict | None = None
    gastro_whatsapp: str | None = Field(default=None, max_length=50)
    gastro_instagram: str | None = Field(default=None, max_length=100)
    gastro_web: str | None = Field(default=None, max_length=500)
    gastro_email: str | None = Field(default=None, max_length=255)
    has_delivery: bool | None = None
    has_reservations: bool | None = None
    price_range: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    is_verified: bool | None = None
    is_active: bool | None = None

    @field_validator("gastro_types")
    @classmethod
    def validate_gastro_types(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return value
        return _validate_gastro_types(value)

    @field_validator("price_range")
    @classmethod
    def validate_price_range(cls, value: str | None) -> str | None:
        if value is not None and value not in VALID_PRICE_RANGES:
            raise ValueError("price_range debe ser '$', '$$', '$$$' o null")
        return value

    @field_validator("opening_hours")
    @classmethod
    def validate_opening_hours(cls, value: dict | None) -> dict | None:
        return _validate_opening_hours(value)


class LocationGastroVerifyUpdate(BaseModel):
    is_verified: bool


class LocationGastroPlanUpdate(BaseModel):
    plan: str

    @field_validator("plan")
    @classmethod
    def validate_plan(cls, value: str) -> str:
        if value not in {"gratis", "dest", "pro"}:
            raise ValueError("plan debe ser 'gratis', 'dest' o 'pro'")
        return value
