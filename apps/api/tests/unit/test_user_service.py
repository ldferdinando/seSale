from datetime import date, time
from uuid import uuid4

import pytest

from app.models import Event, EventStatus
from app.services.user_service import (
    create_user_by_admin,
    get_user,
    list_users,
    list_users_admin,
    update_user,
    update_user_active,
    update_user_role,
    verify_user,
)


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


def test_create_user_by_admin_sets_created_by(session, admin, city):
    user = create_user_by_admin(
        session,
        admin_id=admin.id,
        email="cliente-banner@sesale.com.ar",
        password="Password123!",
        public_name="Cliente Banner",
        full_name="Cliente Banner SA",
        city_id=city.id,
        role="user",
        doc_type=None,
        doc_number=None,
        phone=None,
    )

    assert user.created_by == admin.id
    assert user.role == "user"


def test_create_user_by_admin_duplicate_email_raises(session, admin, organizer, city):
    with pytest.raises(ValueError):
        create_user_by_admin(
            session,
            admin_id=admin.id,
            email=organizer.email,
            password="Password123!",
            public_name="Duplicado",
            full_name="Duplicado",
            city_id=city.id,
            role="user",
            doc_type=None,
            doc_number=None,
            phone=None,
        )


def test_list_users_admin_returns_all_roles_and_states(session, organizer, admin):
    organizer.is_active = False
    session.add(organizer)
    session.commit()

    users = list_users_admin(session)

    emails = {u.email for u in users}
    assert organizer.email in emails
    assert admin.email in emails
    inactive = next(u for u in users if u.email == organizer.email)
    assert inactive.is_active is False


def test_list_users_admin_search_filters_by_public_name(session, organizer, admin):
    users = list_users_admin(session, search="Tinglado")

    emails = {u.email for u in users}
    assert organizer.email in emails
    assert admin.email not in emails


def test_list_users_admin_role_filter(session, organizer, admin):
    users = list_users_admin(session, role="admin")

    emails = {u.email for u in users}
    assert emails == {admin.email}


def test_list_users_admin_is_active_filter(session, organizer, admin):
    organizer.is_active = False
    session.add(organizer)
    session.commit()

    users = list_users_admin(session, is_active=False)

    emails = {u.email for u in users}
    assert emails == {organizer.email}


def test_list_users_admin_resolves_city_name(session, organizer, city):
    users = list_users_admin(session, search=organizer.email)

    result = next(u for u in users if u.email == organizer.email)
    assert result.city_name == city.name


def test_list_users_admin_computes_event_count(session, organizer, city, location):
    for _ in range(3):
        session.add(
            Event(
                city_id=city.id,
                organizer_id=organizer.id,
                location_id=location.id,
                title="Evento",
                date=date(2030, 1, 1),
                time=time(20, 0),
                time_end=time(22, 0),
                status=EventStatus.pending,
            )
        )
    session.commit()

    users = list_users_admin(session, search=organizer.email)

    result = next(u for u in users if u.email == organizer.email)
    assert result.event_count == 3


def test_list_users_admin_event_count_zero_by_default(session, organizer):
    users = list_users_admin(session, search=organizer.email)

    result = next(u for u in users if u.email == organizer.email)
    assert result.event_count == 0


def test_update_user_role_changes_role(session, organizer):
    updated = update_user_role(session, organizer.id, "admin")

    assert updated.role == "admin"


def test_update_user_role_raises_for_unknown_id(session):
    with pytest.raises(LookupError):
        update_user_role(session, uuid4(), "admin")


def test_update_user_active_toggles_flag(session, organizer):
    assert organizer.is_active is True

    updated = update_user_active(session, organizer.id, False)

    assert updated.is_active is False


def test_update_user_active_raises_for_unknown_id(session):
    with pytest.raises(LookupError):
        update_user_active(session, uuid4(), False)
