"""P0-4 (PERFORMANCE_AUDIT.md) — redimensionado y recompresión de imágenes
al subir (`app/core/storage.py`): lo que termina guardado es la versión
WebP achicada, nunca el original, y si la imagen no se puede procesar se
devuelve un error claro sin tocar la imagen anterior.
"""

import io
import random
import uuid
from datetime import date, time
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from PIL import Image
from sqlmodel import Session

from app.core import storage
from app.core.storage import (
    BANNER_MAX_WIDTH,
    COVER_MAX_WIDTH,
    FLYER_MAX_WIDTH,
    InvalidFlyerFileError,
    optimize_image,
    upload_banner,
    upload_cover,
    upload_flyer,
)
from app.models import City, Event, EventStatus, Location, PlanType, User


def _noisy_jpeg(width: int = 2160, height: int = 2700, quality: int = 80) -> bytes:
    """JPEG "pesado" de prueba: ruido aleatorio, que comprime mal (como una
    foto real de celular) en vez de un color plano que pesa casi nada."""
    rng = random.Random(42)
    img = Image.frombytes("RGB", (width, height), rng.randbytes(width * height * 3))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    return buf.getvalue()


def _image_bytes(size: tuple[int, int], fmt: str, mode: str = "RGB", color: object = "red", **save_kwargs) -> bytes:
    buf = io.BytesIO()
    Image.new(mode, size, color).save(buf, format=fmt, **save_kwargs)
    return buf.getvalue()


def _decode(data: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(data))
    img.load()
    return img


# ── optimize_image ──────────────────────────────────────────────────────


def test_optimize_image_downscales_to_max_width_keeping_aspect_ratio_and_outputs_webp():
    original = _image_bytes((2160, 2700), "JPEG")  # 4:5

    result = _decode(optimize_image(original, FLYER_MAX_WIDTH))

    assert result.format == "WEBP"
    assert result.size == (1080, 1350)


def test_optimize_image_never_upscales():
    result = _decode(optimize_image(_image_bytes((400, 500), "PNG"), FLYER_MAX_WIDTH))

    assert result.size == (400, 500)


def test_optimize_image_caps_height_at_twice_the_max_width():
    result = _decode(optimize_image(_image_bytes((1000, 5000), "PNG"), FLYER_MAX_WIDTH))

    assert result.size == (432, 2160)


def test_optimize_image_heavy_photo_ends_up_much_smaller():
    original = _noisy_jpeg()
    # Entre 2 y 5MB, como un flyer sacado del celular (~3.9MB).
    assert 2 * 1024 * 1024 < len(original) < storage.MAX_FLYER_SIZE_BYTES

    optimized = optimize_image(original, FLYER_MAX_WIDTH)

    assert len(optimized) < len(original) / 3


def test_optimize_image_keeps_transparency():
    original = _image_bytes((10, 10), "PNG", mode="RGBA", color=(255, 0, 0, 0))

    result = _decode(optimize_image(original, FLYER_MAX_WIDTH))

    assert result.mode == "RGBA"


def test_optimize_image_applies_exif_orientation():
    # Foto de celular "acostada" en píxeles pero con EXIF Orientation=6
    # (rotar 90°): se tiene que guardar ya derecha y sin EXIF.
    exif = Image.Exif()
    exif[0x0112] = 6
    original = _image_bytes((300, 200), "JPEG", exif=exif.tobytes())

    result = _decode(optimize_image(original, FLYER_MAX_WIDTH))

    assert result.size == (200, 300)
    assert 0x0112 not in result.getexif()


@pytest.mark.parametrize(
    "content",
    [
        b"\xff\xd8\xff" + b"0" * 100,  # header JPEG + basura
        b"no soy una imagen",
        _image_bytes((10, 10), "PNG")[:40],  # PNG truncado
    ],
)
def test_optimize_image_corrupt_file_raises_clear_error(content: bytes):
    with pytest.raises(InvalidFlyerFileError, match="No se pudo procesar la imagen"):
        optimize_image(content, FLYER_MAX_WIDTH)


def test_optimize_image_rejects_format_not_allowed_even_if_decodable():
    # Un GIF real declarado como image/png: el formato real no es estático permitido.
    with pytest.raises(InvalidFlyerFileError):
        optimize_image(_image_bytes((10, 10), "GIF"), FLYER_MAX_WIDTH)


def test_optimize_image_rejects_huge_resolution():
    with patch.object(storage, "MAX_IMAGE_PIXELS", 99):
        with pytest.raises(InvalidFlyerFileError, match="resolución"):
            optimize_image(_image_bytes((10, 10), "PNG"), FLYER_MAX_WIDTH)


# ── upload_* (fallback a disco local) ───────────────────────────────────


def test_upload_flyer_stores_optimized_webp_with_versioned_name(tmp_path):
    event_id = uuid.uuid4()
    original = _noisy_jpeg()

    with patch("app.core.storage._UPLOADS_DIR", tmp_path):
        first = upload_flyer(original, "flyer.jpg", "image/jpeg", event_id)
        second = upload_flyer(original, "flyer.jpg", "image/jpeg", event_id, previous_url=first)

    assert first != second  # nombre único por subida → no queda cacheado el anterior
    assert first.startswith(f"/uploads/flyers/{event_id}/{event_id}-") and first.endswith(".webp")
    stored_files = list((tmp_path / str(event_id)).iterdir())
    assert len(stored_files) == 1
    stored = stored_files[0].read_bytes()
    assert len(stored) < len(original)
    assert _decode(stored).size == (FLYER_MAX_WIDTH, 1350)


def test_upload_flyer_invalid_image_keeps_previous_file(tmp_path):
    event_id = uuid.uuid4()

    with patch("app.core.storage._UPLOADS_DIR", tmp_path):
        first = upload_flyer(_image_bytes((40, 50), "PNG"), "a.png", "image/png", event_id)
        with pytest.raises(InvalidFlyerFileError):
            upload_flyer(b"\xff\xd8\xff" + b"0" * 100, "b.jpg", "image/jpeg", event_id, previous_url=first)

    assert [f.name for f in (tmp_path / str(event_id)).iterdir()] == [first.split("/")[-1]]


def test_upload_cover_resizes_to_cover_max_width(tmp_path):
    location_id = uuid.uuid4()

    with patch("app.core.storage._COVER_UPLOADS_DIR", tmp_path):
        url = upload_cover(_image_bytes((3200, 1800), "JPEG"), "c.jpg", "image/jpeg", location_id)

    assert url.endswith(".webp")
    stored = next((tmp_path / str(location_id)).iterdir()).read_bytes()
    assert _decode(stored).size == (COVER_MAX_WIDTH, 720)


def test_upload_banner_static_image_is_resized_to_webp(tmp_path):
    item_id = uuid.uuid4()

    with patch("app.core.storage._BANNER_UPLOADS_DIR", tmp_path):
        url = upload_banner(_image_bytes((2880, 740), "PNG"), "b.png", "image/png", item_id)

    assert url.endswith(".webp")
    stored = next((tmp_path / str(item_id)).iterdir()).read_bytes()
    assert _decode(stored).width == BANNER_MAX_WIDTH


def test_upload_banner_gif_is_stored_untouched(tmp_path):
    item_id = uuid.uuid4()
    gif = _image_bytes((20, 10), "GIF")

    with patch("app.core.storage._BANNER_UPLOADS_DIR", tmp_path):
        url = upload_banner(gif, "b.gif", "image/gif", item_id)

    assert url.endswith(".gif")
    assert next((tmp_path / str(item_id)).iterdir()).read_bytes() == gif


def test_upload_banner_corrupt_gif_raises(tmp_path):
    with patch("app.core.storage._BANNER_UPLOADS_DIR", tmp_path):
        with pytest.raises(InvalidFlyerFileError):
            upload_banner(b"GIF89a" + b"0" * 50, "b.gif", "image/gif", uuid.uuid4())


def test_upload_to_supabase_sends_optimized_webp():
    event_id = uuid.uuid4()
    with (
        patch("app.core.storage._supabase_configured", return_value=True),
        patch("app.core.storage._upload_to_supabase", return_value="https://x.supabase.co/f.webp") as fake_upload,
    ):
        upload_flyer(_image_bytes((2160, 2700), "JPEG"), "f.jpg", "image/jpeg", event_id)

    content, object_name, content_type, called_event_id = fake_upload.call_args.args
    assert content_type == "image/webp"
    assert object_name.endswith(".webp")
    assert called_event_id == event_id
    assert _decode(content).size == (1080, 1350)


# ── Endpoint: error claro al usuario ────────────────────────────────────


async def test_post_flyer_corrupt_image_returns_422_and_keeps_existing_flyer(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, user_token_headers, tmp_path
):
    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title="Show",
        date=date(2026, 6, 1),
        time=time(21, 0),
        time_end=time(23, 0),
        status=EventStatus.approved,
        plan=PlanType.pro,
    )
    session.add(event)
    session.commit()
    session.refresh(event)

    with patch("app.core.storage._UPLOADS_DIR", tmp_path):
        ok = await client.post(
            f"/api/events/{event.id}/flyer",
            files={"file": ("f.png", _image_bytes((40, 50), "PNG"), "image/png")},
            headers=user_token_headers,
        )
        assert ok.status_code == 200
        previous_url = ok.json()["flyer_url"]

        bad = await client.post(
            f"/api/events/{event.id}/flyer",
            files={"file": ("f.jpg", b"\xff\xd8\xff" + b"0" * 100, "image/jpeg")},
            headers=user_token_headers,
        )

    assert bad.status_code == 422
    assert "No se pudo procesar la imagen" in bad.json()["detail"]
    session.refresh(event)
    assert event.flyer_url == previous_url
    assert (tmp_path / str(event.id) / previous_url.split("/")[-1]).exists()
