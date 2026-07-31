from uuid import uuid4

import pytest

from app.services.user_service import get_user, list_users, update_user, verify_user


def test_get_user_returns_user(session, organizer):
    user = get_user(session, organizer.id)

    assert user.id == organizer.id


def test_get_user_raises_for_unknown_id(session):
    with pytest.raises(LookupError):
        get_user(session, uuid4())


def test_list_users_returns_all(session, organizer, admin):
    users = list_users(session)

    ids = {u.id for u in users}
    assert organizer.id in ids
    assert admin.id in ids


def test_list_users_respects_limit_and_offset(session, organizer, admin):
    users = list_users(session, limit=1, offset=0)

    assert len(users) == 1


def test_update_user_applies_partial_update(session, organizer):
    updated = update_user(session, organizer, {"public_name": "Nuevo Nombre"})

    assert updated.public_name == "Nuevo Nombre"
    assert updated.full_name == organizer.full_name


def test_verify_user_sets_is_verified(session, organizer):
    assert organizer.is_verified is False

    verified = verify_user(session, organizer.id)

    assert verified.is_verified is True


def test_verify_user_raises_for_unknown_id(session):
    with pytest.raises(LookupError):
        verify_user(session, uuid4())
