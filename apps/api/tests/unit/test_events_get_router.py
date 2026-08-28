from datetime import date, datetime, time, timezone
from uuid import uuid4

from httpx import AsyncClient
from sqlmodel import Session

from app.core.security import create_access_token, hash_password
from app.models import City, Event, EventCategory, EventStatus, Location, Plan, PlanPrice, User
from app.models.subscription import Subscription, SubscriptionStatus


def _make_event(session: Session, *, city: City, organizer: User, location: Location, **kwargs) -> Event:
    defaults = dict(
        title="Evento de prueba",
        date=date(2026, 6, 1),
        time=time(21, 0),
        time_end=time(23, 0),
        category="musica",
        status=EventStatus.approved,
        is_active=True,
    )
    defaults.update(kwargs)
    category = defaults.pop("category")
    event = Event(city_id=city.id, organizer_id=organizer.id, location_id=location.id, **defaults)
    session.add(event)
    session.commit()
    session.refresh(event)
    session.add(EventCategory(event_id=event.id, category=category))
    session.commit()
    return event


async def test_get_event_detail_includes_contact_facebook(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location
):
    event = _make_event(session, city=city, organizer=organizer, location=location, contact_facebook="MiPagina")

    response = await client.get(f"/api/events/{event.id}")

    assert response.status_code == 200
    assert response.json()["contact_facebook"] == "MiPagina"


async def test_get_event_approved_returns_200_with_full_data(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location
):
    event = _make_event(session, city=city, organizer=organizer, location=location)

    response = await client.get(f"/api/events/{event.id}")

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Evento de prueba"
    assert body["city_name"] == city.name
    assert body["location"]["name"] == location.name
    assert body["organizer_id"] == str(organizer.id)
    assert body["organizer"]["public_name"] == organizer.public_name
    assert body["organizer"]["public_whatsapp"] == organizer.public_whatsapp
    assert body["organizer"]["city"] == city.name


def _make_subscription(session: Session, *, organizer: User, admin: User, event: Event) -> Subscription:
    plan = Plan(name="Destacado", plan_type="dest", pricing_type="fixed", is_active=True)
    session.add(plan)
    session.commit()
    session.refresh(plan)
    price = PlanPrice(plan_id=plan.id, amount=3500, valid_from=date.today(), created_by=admin.id)
    session.add(price)
    session.commit()
    session.refresh(price)
    now = datetime.now(timezone.utc)
    subscription = Subscription(
        user_id=organizer.id,
        plan_id=plan.id,
        plan_price_id=price.id,
        event_id=event.id,
        status=SubscriptionStatus.pending_approval,
        payment_method="transfer",
        transfer_note="Ya transferí, mando comprobante por WhatsApp",
        starts_at=now,
        expires_at=now,
        amount_paid=3500,
    )
    session.add(subscription)
    session.commit()
    return subscription


async def test_get_event_approved_organizer_sees_organizer_subscription(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    admin: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    event = _make_event(session, city=city, organizer=organizer, location=location)
    _make_subscription(session, organizer=organizer, admin=admin, event=event)

    response = await client.get(f"/api/events/{event.id}", headers=user_token_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["organizer_subscription"]["status"] == "pending_approval"
    assert body["organizer_subscription"]["payment_method"] == "transfer"


async def test_get_event_does_not_show_subscription_from_a_different_event(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    admin: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    """Etapa 6b-2: el pago es de UN evento puntual — la Subscription de otro
    evento del mismo organizador no debe aparecer acá.
    """
    event_with_transfer = _make_event(session, city=city, organizer=organizer, location=location, title="Con pago")
    unrelated_event = _make_event(session, city=city, organizer=organizer, location=location, title="Sin relación")
    _make_subscription(session, organizer=organizer, admin=admin, event=event_with_transfer)

    response = await client.get(f"/api/events/{unrelated_event.id}", headers=user_token_headers)

    assert response.status_code == 200
    assert response.json()["organizer_subscription"] is None


async def test_get_event_approved_admin_sees_organizer_subscription(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    admin: User,
    location: Location,
    admin_token_headers: dict[str, str],
):
    event = _make_event(session, city=city, organizer=organizer, location=location)
    _make_subscription(session, organizer=organizer, admin=admin, event=event)

    response = await client.get(f"/api/events/{event.id}", headers=admin_token_headers)

    assert response.status_code == 200
    assert response.json()["organizer_subscription"]["status"] == "pending_approval"


async def test_get_event_approved_public_never_sees_organizer_subscription(
    client: AsyncClient, session: Session, city: City, organizer: User, admin: User, location: Location
):
    event = _make_event(session, city=city, organizer=organizer, location=location)
    _make_subscription(session, organizer=organizer, admin=admin, event=event)

    response = await client.get(f"/api/events/{event.id}")

    assert response.status_code == 200
    assert response.json()["organizer_subscription"] is None


async def test_get_event_pending_without_auth_returns_404(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location
):
    event = _make_event(session, city=city, organizer=organizer, location=location, status=EventStatus.pending)

    response = await client.get(f"/api/events/{event.id}")

    assert response.status_code == 404


async def test_get_event_pending_with_organizer_token_returns_200(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    event = _make_event(session, city=city, organizer=organizer, location=location, status=EventStatus.pending)

    response = await client.get(f"/api/events/{event.id}", headers=user_token_headers)

    assert response.status_code == 200
    assert response.json()["status"] == "pending"


async def test_get_event_pending_with_other_users_token_returns_404(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location
):
    event = _make_event(session, city=city, organizer=organizer, location=location, status=EventStatus.pending)

    other_user = User(
        email="otro@sesale.com.ar",
        hashed_password=hash_password("Password123!"),
        full_name="Otro",
        public_name="Otro",
        city_id=city.id,
    )
    session.add(other_user)
    session.commit()
    session.refresh(other_user)
    headers = {"Authorization": f"Bearer {create_access_token(other_user.id, other_user.role)}"}

    response = await client.get(f"/api/events/{event.id}", headers=headers)

    assert response.status_code == 404


async def test_get_event_pending_with_admin_token_returns_200(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    admin_token_headers: dict[str, str],
):
    event = _make_event(session, city=city, organizer=organizer, location=location, status=EventStatus.pending)

    response = await client.get(f"/api/events/{event.id}", headers=admin_token_headers)

    assert response.status_code == 200
    assert response.json()["status"] == "pending"


async def test_get_event_not_found_returns_404(client: AsyncClient):
    response = await client.get(f"/api/events/{uuid4()}")

    assert response.status_code == 404


# Etapa 9a — banner "Organizador verificado" con datos reales (ver a_revisar.md).


async def test_get_event_organizer_verified_exposes_verification_fields(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location
):
    organizer.is_verified = True
    organizer.phone_verified = True
    organizer.email_verified = True
    session.add(organizer)
    session.commit()
    session.refresh(organizer)

    event = _make_event(session, city=city, organizer=organizer, location=location)

    response = await client.get(f"/api/events/{event.id}")

    assert response.status_code == 200
    body = response.json()["organizer"]
    assert body["is_verified"] is True
    assert body["phone_verified"] is True
    assert body["email_verified"] is True
    assert body["member_since"] == organizer.created_at.date().isoformat()


async def test_get_event_organizer_not_verified_exposes_false_without_leaking_private_data(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location
):
    # El fixture `organizer` ya nace con is_verified/phone_verified/email_verified=False.
    event = _make_event(session, city=city, organizer=organizer, location=location)

    response = await client.get(f"/api/events/{event.id}")

    assert response.status_code == 200
    body = response.json()["organizer"]
    assert body["is_verified"] is False
    assert body["phone_verified"] is False
    assert body["email_verified"] is False
    assert "member_since" in body
    for private_field in ("doc_type", "doc_number", "phone", "full_name", "email"):
        assert private_field not in body
