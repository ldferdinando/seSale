"""Storage de archivos — Etapa 8b (flyers de eventos, plan Destacado Plus) y
Etapa 8d (imágenes de banners, `AdItem`).

Con Supabase configurado (`SUPABASE_URL`/`SUPABASE_SERVICE_KEY`), sube al
bucket público `SUPABASE_STORAGE_BUCKET` (default "flyers") en el path
`{event_id}/{filename}`. Sin Supabase configurado (desarrollo local sin
credenciales), guarda en `apps/api/uploads/flyers/{event_id}/` y devuelve una
ruta relativa servida por el propio backend (ver `app/main.py`).

P0-4 (PERFORMANCE_AUDIT.md): antes de guardar, toda imagen estática pasa
por `optimize_image()` — se decodifica con Pillow, se corrige la orientación
EXIF, se achica a un ancho máximo por tipo y se recomprime a WebP. Lo que
termina en el bucket es siempre la versión optimizada, nunca el original.
Los GIF de banners (pueden ser animados) solo se validan y se guardan tal
cual.
"""

import io
import warnings
from pathlib import Path
from uuid import UUID, uuid4

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import settings

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_FLYER_SIZE_BYTES = 5 * 1024 * 1024  # 5MB

# Etapa 8d — banners: además de jpg/png/webp se permite GIF (pueden ser
# animados), pero con un límite de tamaño más chico que el flyer (2MB, pedido
# explícito de la consigna).
ALLOWED_BANNER_CONTENT_TYPES = ALLOWED_CONTENT_TYPES | {"image/gif"}
MAX_BANNER_SIZE_BYTES = 2 * 1024 * 1024  # 2MB

_UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "flyers"
_BANNER_UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "banners"
_COVER_UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "covers"


# P0-4 — redimensionado al subir. Solo se achica (nunca se agranda) y se
# mantiene la proporción original: el alto máximo es 2× el ancho, para
# acotar imágenes larguísimas sin recortar las proporciones normales.
FLYER_MAX_WIDTH = 1080  # flyer 4:5 → 1080×1350, "como Instagram"
COVER_MAX_WIDTH = 1280  # portada gastro 16:9 → 1280×720
BANNER_MAX_WIDTH = 1440  # banner wide (~3.9:1) a 2× DPR del container de 672px
WEBP_QUALITY = 82
# Tope de píxeles decodificados (≈ 50 MP): un archivo de 5MB puede
# declarar dimensiones absurdas (decompression bomb).
MAX_IMAGE_PIXELS = 50_000_000

_STATIC_FORMATS = {"JPEG", "PNG", "WEBP"}

_INVALID_IMAGE_MESSAGE = (
    "No se pudo procesar la imagen. Verificá que el archivo no esté dañado y sea un JPG, PNG o WEBP válido."
)


class InvalidFlyerFileError(ValueError):
    """Formato o tamaño de archivo inválido — el router la mapea a 422."""


def _open_image(file_content: bytes, allowed_formats: set[str]) -> Image.Image:
    """Decodifica la imagen completa (no solo el header) o levanta
    InvalidFlyerFileError. El formato real tiene que estar en
    `allowed_formats`, más allá del content-type que declaró el cliente."""
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            img = Image.open(io.BytesIO(file_content))
            if img.width * img.height > MAX_IMAGE_PIXELS:
                raise InvalidFlyerFileError("La imagen tiene una resolución demasiado grande.")
            if img.format not in allowed_formats:
                raise InvalidFlyerFileError(_INVALID_IMAGE_MESSAGE)
            img.load()
    except InvalidFlyerFileError:
        raise
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError,
            Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise InvalidFlyerFileError(_INVALID_IMAGE_MESSAGE) from exc
    return img


def optimize_image(file_content: bytes, max_width: int) -> bytes:
    """P0-4 — decodifica, corrige orientación EXIF, achica a `max_width` de
    ancho como máximo (alto ≤ 2× ancho, manteniendo proporción) y recomprime
    a WebP calidad `WEBP_QUALITY`. Descarta la metadata (EXIF/GPS del
    celular). Si algo falla levanta InvalidFlyerFileError: nunca se guarda
    el original sin procesar."""
    img = _open_image(file_content, _STATIC_FORMATS)
    try:
        img = ImageOps.exif_transpose(img)
        has_alpha = img.mode in ("RGBA", "LA", "PA") or (img.mode == "P" and "transparency" in img.info)
        img = img.convert("RGBA" if has_alpha else "RGB")
        img.thumbnail((max_width, max_width * 2), Image.Resampling.LANCZOS)
        out = io.BytesIO()
        img.save(out, format="WEBP", quality=WEBP_QUALITY, method=4)
    except (OSError, ValueError) as exc:
        raise InvalidFlyerFileError(_INVALID_IMAGE_MESSAGE) from exc
    return out.getvalue()


def _versioned_object_name(entity_id: UUID, ext: str) -> str:
    """Nombre único por subida (`{id}-{8 hex}{ext}`): next/image y el CDN
    cachean por URL, así que si el reemplazo de un flyer conservara el
    mismo nombre se seguiría viendo el anterior hasta que venza el cache."""
    return f"{entity_id}-{uuid4().hex[:8]}{ext}"


def validate_flyer_file(content_type: str, file_size: int) -> None:
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise InvalidFlyerFileError("Formato no permitido. Subí un archivo JPG, PNG o WEBP.")
    if file_size > MAX_FLYER_SIZE_BYTES:
        raise InvalidFlyerFileError("El archivo supera el tamaño máximo permitido (5MB).")
    if file_size == 0:
        raise InvalidFlyerFileError("El archivo está vacío.")


def _supabase_configured() -> bool:
    return bool(settings.supabase_url and settings.supabase_service_key)


def upload_flyer(
    file_content: bytes,
    filename: str,
    content_type: str,
    event_id: UUID,
    previous_url: str | None = None,
) -> str:
    """Sube el flyer a Supabase Storage. Path en el bucket:
    flyers/{event_id}/{filename}.

    Devuelve la URL pública del archivo. En development sin Supabase
    configurado: guarda en apps/api/uploads/flyers/{event_id}/ y devuelve la
    ruta relativa.

    Si el evento ya tenía un flyer, el caller pasa su URL en `previous_url`
    y se borra recién después de procesar con éxito la imagen nueva: si la
    nueva es inválida, el flyer existente queda intacto.
    """
    validate_flyer_file(content_type, len(file_content))
    optimized = optimize_image(file_content, FLYER_MAX_WIDTH)
    object_name = _versioned_object_name(event_id, ".webp")
    if previous_url:
        delete_flyer(previous_url, event_id)

    if _supabase_configured():
        return _upload_to_supabase(optimized, object_name, "image/webp", event_id)
    return _upload_to_local_disk(optimized, object_name, event_id)


def _upload_to_supabase(file_content: bytes, object_name: str, content_type: str, event_id: UUID) -> str:
    from supabase import create_client  # import diferido — opcional en dev sin Supabase

    client = create_client(settings.supabase_url, settings.supabase_service_key)
    bucket = client.storage.from_(settings.supabase_storage_bucket)
    path = f"{event_id}/{object_name}"
    bucket.upload(path, file_content, {"content-type": content_type, "upsert": "true"})
    return bucket.get_public_url(path)


def _upload_to_local_disk(file_content: bytes, object_name: str, event_id: UUID) -> str:
    event_dir = _UPLOADS_DIR / str(event_id)
    event_dir.mkdir(parents=True, exist_ok=True)
    for old_file in event_dir.iterdir():
        if old_file.is_file():
            old_file.unlink()
    (event_dir / object_name).write_bytes(file_content)
    # Ruta relativa a propósito (no absoluta con API_URL): el backend no
    # puede saber de forma confiable en qué origen es "públicamente"
    # alcanzable (localhost, un túnel de ngrok, producción...) — eso
    # depende de dónde esté parado quien lo mira, no del servidor. Es
    # responsabilidad del frontend resolverla contra NEXT_PUBLIC_API_URL al
    # momento de mostrarla (misma variable que ya usa para toda la API) —
    # ver apps/web/src/lib/media.ts, resolveMediaUrl().
    return f"/uploads/flyers/{event_id}/{object_name}"


def validate_banner_file(content_type: str, file_size: int) -> None:
    if content_type not in ALLOWED_BANNER_CONTENT_TYPES:
        raise InvalidFlyerFileError("Formato no permitido. Subí un archivo JPG, PNG, WEBP o GIF.")
    if file_size > MAX_BANNER_SIZE_BYTES:
        raise InvalidFlyerFileError("El archivo supera el tamaño máximo permitido (2MB).")
    if file_size == 0:
        raise InvalidFlyerFileError("El archivo está vacío.")


def upload_banner(
    file_content: bytes,
    filename: str,
    content_type: str,
    ad_item_id: UUID,
    previous_url: str | None = None,
) -> str:
    """Sube la imagen de un banner (AdItem). Mismo patrón que `upload_flyer`:
    Supabase Storage en producción (bucket `SUPABASE_BANNER_BUCKET`, path
    `{ad_item_id}/{filename}`) o disco local en development
    (`apps/api/uploads/banners/{ad_item_id}/`).

    Si el AdItem ya tenía una imagen, el caller pasa su URL en
    `previous_url` y se borra (si es nuestra, ver `delete_banner_if_owned`)
    recién después de procesar con éxito la imagen nueva.
    """
    validate_banner_file(content_type, len(file_content))
    if content_type == "image/gif":
        # GIF (posiblemente animado): se valida que sea un GIF real pero se
        # guarda tal cual — recomprimirlo perdería la animación.
        _open_image(file_content, {"GIF"})
        stored, stored_type, ext = file_content, "image/gif", ".gif"
    else:
        stored, stored_type, ext = optimize_image(file_content, BANNER_MAX_WIDTH), "image/webp", ".webp"
    object_name = _versioned_object_name(ad_item_id, ext)
    if previous_url:
        delete_banner_if_owned(previous_url, ad_item_id)

    if _supabase_configured():
        return _upload_banner_to_supabase(stored, object_name, stored_type, ad_item_id)
    return _upload_banner_to_local_disk(stored, object_name, ad_item_id)


def _upload_banner_to_supabase(
    file_content: bytes, object_name: str, content_type: str, ad_item_id: UUID
) -> str:
    from supabase import create_client  # import diferido — opcional en dev sin Supabase

    client = create_client(settings.supabase_url, settings.supabase_service_key)
    bucket = client.storage.from_(settings.supabase_banner_bucket)
    path = f"{ad_item_id}/{object_name}"
    bucket.upload(path, file_content, {"content-type": content_type, "upsert": "true"})
    return bucket.get_public_url(path)


def _upload_banner_to_local_disk(file_content: bytes, object_name: str, ad_item_id: UUID) -> str:
    item_dir = _BANNER_UPLOADS_DIR / str(ad_item_id)
    item_dir.mkdir(parents=True, exist_ok=True)
    for old_file in item_dir.iterdir():
        if old_file.is_file():
            old_file.unlink()
    (item_dir / object_name).write_bytes(file_content)
    # Ruta relativa a propósito — misma razón que _upload_to_local_disk (ver
    # arriba): la resuelve el frontend contra NEXT_PUBLIC_API_URL.
    return f"/uploads/banners/{ad_item_id}/{object_name}"


def delete_banner_if_owned(img_url: str, ad_item_id: UUID) -> None:
    """Borra el archivo del storage SOLO si es nuestro (subido por
    upload_banner) — el admin puede haber pegado una URL externa ya hosteada
    (Parte 8c: "pegar una URL directamente"), y esa no hay que tocarla.

    Se detecta por la URL en vez de por `_supabase_configured()` (a
    diferencia de `delete_flyer`) porque acá SÍ puede convivir una imagen
    externa con Supabase configurado.
    """
    if img_url.startswith(f"/uploads/banners/{ad_item_id}/"):
        _delete_banner_from_local_disk(ad_item_id)
        return
    if _supabase_configured() and f"/{settings.supabase_banner_bucket}/{ad_item_id}/" in img_url:
        _delete_banner_from_supabase(img_url, ad_item_id)


def _delete_banner_from_supabase(img_url: str, ad_item_id: UUID) -> None:
    from supabase import create_client

    client = create_client(settings.supabase_url, settings.supabase_service_key)
    bucket = client.storage.from_(settings.supabase_banner_bucket)
    filename = img_url.rstrip("/").split("/")[-1]
    bucket.remove([f"{ad_item_id}/{filename}"])


def _delete_banner_from_local_disk(ad_item_id: UUID) -> None:
    item_dir = _BANNER_UPLOADS_DIR / str(ad_item_id)
    if not item_dir.exists():
        return
    for f in item_dir.iterdir():
        if f.is_file():
            f.unlink()
    try:
        item_dir.rmdir()
    except OSError:
        pass


def upload_cover(
    file_content: bytes,
    filename: str,
    content_type: str,
    location_id: UUID,
    previous_url: str | None = None,
) -> str:
    """Sube la foto de portada de un lugar gastronómico (Location.cover_img_url).
    Mismo patrón que upload_flyer: Supabase Storage en producción (bucket
    `SUPABASE_COVER_BUCKET`, path `{location_id}/{filename}`) o disco local
    en development (`apps/api/uploads/covers/{location_id}/`). Mismos
    formatos/tamaño que el flyer de eventos (JPG/PNG/WEBP, máx. 5MB) — no
    hay un límite distinto pedido para covers, a diferencia de los banners.

    Si el lugar ya tenía cover, el caller pasa su URL en `previous_url` y se
    borra recién después de procesar con éxito la imagen nueva.
    """
    validate_flyer_file(content_type, len(file_content))
    optimized = optimize_image(file_content, COVER_MAX_WIDTH)
    object_name = _versioned_object_name(location_id, ".webp")
    if previous_url:
        delete_cover(previous_url, location_id)

    if _supabase_configured():
        return _upload_cover_to_supabase(optimized, object_name, "image/webp", location_id)
    return _upload_cover_to_local_disk(optimized, object_name, location_id)


def _upload_cover_to_supabase(
    file_content: bytes, object_name: str, content_type: str, location_id: UUID
) -> str:
    from supabase import create_client  # import diferido — opcional en dev sin Supabase

    client = create_client(settings.supabase_url, settings.supabase_service_key)
    bucket = client.storage.from_(settings.supabase_cover_bucket)
    path = f"{location_id}/{object_name}"
    bucket.upload(path, file_content, {"content-type": content_type, "upsert": "true"})
    return bucket.get_public_url(path)


def _upload_cover_to_local_disk(file_content: bytes, object_name: str, location_id: UUID) -> str:
    location_dir = _COVER_UPLOADS_DIR / str(location_id)
    location_dir.mkdir(parents=True, exist_ok=True)
    for old_file in location_dir.iterdir():
        if old_file.is_file():
            old_file.unlink()
    (location_dir / object_name).write_bytes(file_content)
    # Ruta relativa a propósito — misma razón que _upload_to_local_disk (ver
    # arriba): la resuelve el frontend contra NEXT_PUBLIC_API_URL.
    return f"/uploads/covers/{location_id}/{object_name}"


def delete_cover(cover_img_url: str, location_id: UUID) -> None:
    """Elimina la foto de portada existente del storage correspondiente
    (Supabase o disco local)."""
    if _supabase_configured():
        _delete_cover_from_supabase(cover_img_url, location_id)
    else:
        _delete_cover_from_local_disk(location_id)


def _delete_cover_from_supabase(cover_img_url: str, location_id: UUID) -> None:
    from supabase import create_client

    client = create_client(settings.supabase_url, settings.supabase_service_key)
    bucket = client.storage.from_(settings.supabase_cover_bucket)
    filename = cover_img_url.rstrip("/").split("/")[-1]
    bucket.remove([f"{location_id}/{filename}"])


def _delete_cover_from_local_disk(location_id: UUID) -> None:
    location_dir = _COVER_UPLOADS_DIR / str(location_id)
    if not location_dir.exists():
        return
    for f in location_dir.iterdir():
        if f.is_file():
            f.unlink()
    try:
        location_dir.rmdir()
    except OSError:
        pass


def delete_flyer(flyer_url: str, event_id: UUID) -> None:
    """Elimina el flyer existente del storage correspondiente (Supabase o
    disco local)."""
    if _supabase_configured():
        _delete_from_supabase(flyer_url, event_id)
    else:
        _delete_from_local_disk(event_id)


def _delete_from_supabase(flyer_url: str, event_id: UUID) -> None:
    from supabase import create_client

    client = create_client(settings.supabase_url, settings.supabase_service_key)
    bucket = client.storage.from_(settings.supabase_storage_bucket)
    filename = flyer_url.rstrip("/").split("/")[-1]
    bucket.remove([f"{event_id}/{filename}"])


def _delete_from_local_disk(event_id: UUID) -> None:
    event_dir = _UPLOADS_DIR / str(event_id)
    if not event_dir.exists():
        return
    for f in event_dir.iterdir():
        if f.is_file():
            f.unlink()
    try:
        event_dir.rmdir()
    except OSError:
        pass  # no vacío por alguna razón — no bloquea el delete del flyer_url en DB
