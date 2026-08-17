"""Storage de archivos — Etapa 8b (flyers de eventos, plan Destacado Plus) y
Etapa 8d (imágenes de banners, `AdItem`).

Con Supabase configurado (`SUPABASE_URL`/`SUPABASE_SERVICE_KEY`), sube al
bucket público `SUPABASE_STORAGE_BUCKET` (default "flyers") en el path
`{event_id}/{filename}`. Sin Supabase configurado (desarrollo local sin
credenciales), guarda en `apps/api/uploads/flyers/{event_id}/` y devuelve una
ruta relativa servida por el propio backend (ver `app/main.py`).
"""

import mimetypes
from pathlib import Path
from uuid import UUID

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


class InvalidFlyerFileError(ValueError):
    """Formato o tamaño de archivo inválido — el router la mapea a 422."""


def validate_flyer_file(content_type: str, file_size: int) -> None:
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise InvalidFlyerFileError("Formato no permitido. Subí un archivo JPG, PNG o WEBP.")
    if file_size > MAX_FLYER_SIZE_BYTES:
        raise InvalidFlyerFileError("El archivo supera el tamaño máximo permitido (5MB).")
    if file_size == 0:
        raise InvalidFlyerFileError("El archivo está vacío.")


def _extension_for(content_type: str, filename: str) -> str:
    ext = mimetypes.guess_extension(content_type) or Path(filename).suffix or ".jpg"
    return ".jpg" if ext == ".jpe" else ext


def _supabase_configured() -> bool:
    return bool(settings.supabase_url and settings.supabase_service_key)


async def upload_flyer(
    file_content: bytes,
    filename: str,
    content_type: str,
    event_id: UUID,
) -> str:
    """Sube el flyer a Supabase Storage. Path en el bucket: flyers/{event_id}/{filename}.

    Devuelve la URL pública del archivo. En development sin Supabase
    configurado: guarda en apps/api/uploads/flyers/{event_id}/ y devuelve la
    ruta relativa.

    Si el evento ya tenía un flyer, el caller (`event_service.upload_event_flyer`)
    es responsable de llamar a `delete_flyer` antes para no acumular archivos
    huérfanos.
    """
    validate_flyer_file(content_type, len(file_content))
    object_name = f"{event_id}{_extension_for(content_type, filename)}"

    if _supabase_configured():
        return _upload_to_supabase(file_content, object_name, content_type, event_id)
    return _upload_to_local_disk(file_content, object_name, event_id)


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


async def upload_banner(
    file_content: bytes,
    filename: str,
    content_type: str,
    ad_item_id: UUID,
) -> str:
    """Sube la imagen de un banner (AdItem). Mismo patrón que `upload_flyer`:
    Supabase Storage en producción (bucket `SUPABASE_BANNER_BUCKET`, path
    `{ad_item_id}/{filename}`) o disco local en development
    (`apps/api/uploads/banners/{ad_item_id}/`).

    Si el AdItem ya tenía una imagen, el caller (`ad_service.upload_ad_item_image`)
    es responsable de llamar a `delete_banner_if_owned` antes.
    """
    validate_banner_file(content_type, len(file_content))
    object_name = f"{ad_item_id}{_extension_for(content_type, filename)}"

    if _supabase_configured():
        return _upload_banner_to_supabase(file_content, object_name, content_type, ad_item_id)
    return _upload_banner_to_local_disk(file_content, object_name, ad_item_id)


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


def delete_flyer(flyer_url: str, event_id: UUID) -> None:
    """Elimina el flyer existente del storage correspondiente (Supabase o disco local)."""
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
