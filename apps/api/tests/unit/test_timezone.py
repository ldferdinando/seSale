from datetime import date, datetime, time, timezone
from unittest.mock import patch

from app.core.timezone import ARGENTINA_TZ, argentina_today, utc_time_to_argentina


def test_argentina_today_does_not_roll_forward_before_utc_midnight():
    """A las 23:00 ART (02:00 UTC del día siguiente) el día en Argentina
    todavía no cambió, aunque el servidor (en UTC) ya esté en el día
    siguiente."""
    fake_utc_now = datetime(2026, 8, 12, 2, 0, tzinfo=timezone.utc)  # 23:00 ART del 11
    with patch("app.core.timezone.datetime") as mock_datetime:
        mock_datetime.now.side_effect = lambda tz=None: fake_utc_now.astimezone(tz) if tz else fake_utc_now
        assert argentina_today() == date(2026, 8, 11)


def test_argentina_today_matches_utc_during_the_day():
    fake_utc_now = datetime(2026, 8, 12, 15, 0, tzinfo=timezone.utc)  # 12:00 ART
    with patch("app.core.timezone.datetime") as mock_datetime:
        mock_datetime.now.side_effect = lambda tz=None: fake_utc_now.astimezone(tz) if tz else fake_utc_now
        assert argentina_today() == date(2026, 8, 12)


def test_utc_time_to_argentina_subtracts_three_hours():
    assert utc_time_to_argentina(date(2026, 8, 11), time(23, 0)) == time(20, 0)


def test_utc_time_to_argentina_wraps_around_midnight():
    # 01:00 UTC == 22:00 ART del día anterior (mismo valor de time, sin fecha).
    assert utc_time_to_argentina(date(2026, 8, 12), time(1, 0)) == time(22, 0)


def test_argentina_tz_has_no_dst_offset_variation():
    # Verifica que siempre es -3, sin importar la época del año.
    winter = datetime(2026, 6, 1, 12, 0, tzinfo=ARGENTINA_TZ)
    summer = datetime(2026, 12, 1, 12, 0, tzinfo=ARGENTINA_TZ)
    assert winter.utcoffset() == summer.utcoffset()
