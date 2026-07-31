import pytest

from app.core.security import create_refresh_token, hash_refresh_token
from app.services.auth_service import (
    authenticate_user,
    issue_tokens,
    register_user,
    revoke_session,
    rotate_refresh_token,
)


def _register(session, city, email="nuevo@sesale.com.ar"):
    return register_user(
        session,
        email=email,
        password="Password123!",
        full_name="Nueva Persona",
        doc_type="dni",
        doc_number="12345678",
        phone="+5491122334455",
        public_name="Nueva Persona Público",
        public_whatsapp=None,
        city_id=city.id,
    )


def test_register_user_creates_user_with_hashed_password(session, city):
    user = _register(session, city)

    assert user.email == "nuevo@sesale.com.ar"
    assert user.hashed_password != "Password123!"
    assert user.role == "user"


def test_register_user_raises_for_duplicate_email(session, city, organizer):
    with pytest.raises(ValueError):
        _register(session, city, email=organizer.email)


def test_authenticate_user_success(session, organizer):
    user = authenticate_user(session, email=organizer.email, password="Password123!")

    assert user.id == organizer.id


def test_authenticate_user_wrong_password_raises(session, organizer):
    with pytest.raises(ValueError):
        authenticate_user(session, email=organizer.email, password="wrong-password")


def test_authenticate_user_unknown_email_raises(session):
    with pytest.raises(ValueError):
        authenticate_user(session, email="no-existe@sesale.com.ar", password="whatever")


def test_issue_tokens_persists_refresh_hash(session, organizer):
    access_token, refresh_token, expires_in = issue_tokens(session, organizer)

    assert access_token
    assert refresh_token
    assert expires_in > 0
    assert organizer.refresh_token_hash == hash_refresh_token(refresh_token)


def test_rotate_refresh_token_success(session, organizer):
    _, refresh_token, _ = issue_tokens(session, organizer)

    access_token, new_refresh_token, expires_in = rotate_refresh_token(session, refresh_token)

    assert access_token
    assert new_refresh_token != refresh_token
    assert expires_in > 0


def test_rotate_refresh_token_rejects_superseded_token(session, organizer):
    stale_refresh = create_refresh_token(organizer.id, organizer.role)
    organizer.refresh_token_hash = hash_refresh_token("a-different-token")
    session.add(organizer)
    session.commit()

    with pytest.raises(ValueError):
        rotate_refresh_token(session, stale_refresh)


def test_rotate_refresh_token_rejects_garbage_token(session):
    with pytest.raises(ValueError):
        rotate_refresh_token(session, "not-a-real-token")


def test_revoke_session_clears_refresh_hash(session, organizer):
    issue_tokens(session, organizer)

    revoke_session(session, organizer)

    assert organizer.refresh_token_hash is None
    assert organizer.refresh_token_expires_at is None
