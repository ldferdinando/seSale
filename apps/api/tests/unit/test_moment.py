from datetime import time

from app.core.moment import calculate_moments


def test_daytime_event_returns_diurno():
    assert calculate_moments(time(10, 0), time(13, 0)) == ["diurno"]


def test_nighttime_event_returns_nocturno():
    assert calculate_moments(time(21, 0), time(23, 0)) == ["nocturno"]


def test_dual_event_returns_both():
    assert calculate_moments(time(18, 0), time(22, 0)) == ["diurno", "nocturno"]


def test_no_end_time_uses_start_time_only():
    assert calculate_moments(time(10, 0), None) == ["diurno"]
    assert calculate_moments(time(22, 0), None) == ["nocturno"]


def test_crossing_midnight_returns_nocturno():
    assert calculate_moments(time(22, 0), time(2, 0)) == ["nocturno"]


def test_crossing_midnight_with_daytime_tail_returns_both():
    assert calculate_moments(time(22, 0), time(9, 0)) == ["diurno", "nocturno"]
