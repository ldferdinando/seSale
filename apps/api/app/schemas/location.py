from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


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
