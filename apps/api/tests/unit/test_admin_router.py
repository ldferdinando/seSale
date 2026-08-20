from datetime import date, datetime, timezone

from httpx import AsyncClient
from sqlmodel import Session

from app.models import City, Event, EventCategory, EventStatus, Location, Plan, PlanPrice, User
from app.models.subscription import Subscription, SubscriptionStatus


def _make_event(session: Session, *, organizer: User, location: Location, city: City, status: EventStatus, title: str) -> Event:
    from datetime import date, time, timedelta

    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title=title,
        date=date.today() + timedelta(days=5),
        time=time(21, 0),
        status=status,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    session.add(EventCategory(event_id=event.id, category="musica"))
    session.commit()
    return event


async def test_get_admin_events_without_token_returns_401(client: AsyncClient):
    response = await client.get("/api/admin/events")

    assert response.status_code == 401


async def test_get_admin_events_as_user_returns_403(client: AsyncClient, user_token_headers: dict[str, str]):
    response = await client.get("/api/admin/events", headers=user_token_headers)

    assert response.status_code == 403


async def test_get_admin_events_returns_all_statuses(
    client: AsyncClient,
    session: Session,
    organizer: User,
    location: Location,
    city: City,
    admin_token_headers: dict[str, str],
):
    _make_event(session, organizer=organizer, location=location, city=city, status=EventStatus.pending, title="Pendiente")
    _make_event(session, organizer=organizer, location=location, city=city, status=EventStatus.approved, title="Aprobado")
    _make_event(session, organizer=organizer, location=location, city=city, status=EventStatus.rejected, title="Rechazado")

    response = await client.get("/api/admin/events", headers=admin_token_headers)

    assert response.status_code == 200
    titles = {e["title"] for e in response.json()}
    assert titles == {"Pendiente", "Aprobado", "Rechazado"}
    assert all("organizer_public_name" in e for e in response.json())


async def test_get_admin_events_includes_organizer_subscription(
    client: AsyncClient,
    session: Session,
    organizer: User,
    admin: User,
    location: Location,
    city: City,
    admin_token_headers: dict[str, str],
):
    event = _make_event(
        session, organizer=organizer, location=location, city=city, status=EventStatus.pending, title="Pendiente"
    )
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
        transfer_note="Ya transferí",
        starts_at=now,
        expires_at=now,
        amount_paid=3500,
    )
    session.add(subscription)
    session.commit()

    response = await client.get("/api/admin/events", headers=admin_token_headers)

    assert response.status_code == 200
    body = next(e for e in response.json() if e["id"] == str(event.id))
    assert body["organizer_subscription"]["status"] == "pending_approval"
    assert body["organizer_subscription"]["payment_method"] == "transfer"
    assert body["organizer_subscription"]["transfer_note"] == "Ya transferí"


async def test_get_admin_events_subscription_does_not_leak_to_another_event_of_same_organizer(
    client: AsyncClient,
    session: Session,
    organizer: User,
    admin: User,
    location: Location,
    city: City,
    admin_token_headers: dict[str, str],
):
    """Etapa 6b-2: el pago es de UN evento puntual, no de la cuenta del
    organizador — otro evento suyo sin pago propio no debe mostrar nada.
    """
    event_with_transfer = _make_event(
        session, organizer=organizer, location=location, city=city, status=EventStatus.pending, title="Con transferencia"
    )
    unrelated_event = _make_event(
        session, organizer=organizer, location=location, city=city, status=EventStatus.pending, title="Sin relación"
    )
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
        event_id=event_with_transfer.id,
        status=SubscriptionStatus.pending_approval,
        payment_method="transfer",
        transfer_note="Ya transferí",
        starts_at=now,
        expires_at=now,
        amount_paid=3500,
    )
    session.add(subscription)
    session.commit()

    response = await client.get("/api/admin/events", headers=admin_token_headers)

    assert response.status_code == 200
    body_unrelated = next(e for e in response.json() if e["id"] == str(unrelated_event.id))
    assert body_unrelated["organizer_subscription"] is None


async def test_get_admin_events_without_subscription_has_null_organizer_subscription(
    client: AsyncClient,
    session: Session,
    organizer: User,
    location: Location,
    city: City,
    admin_token_headers: dict[str, str],
):
    _make_event(session, organizer=organizer, location=location, city=city, status=EventStatus.pending, title="Sin plan")

    response = await client.get("/api/admin/events", headers=admin_token_headers)

    assert response.status_code == 200
    assert response.json()[0]["organizer_subscription"] is None


async def test_get_admin_events_filters_by_status(
    client: AsyncClient,
    session: Session,
    organizer: User,
    location: Location,
    city: City,
    admin_token_headers: dict[str, str],
):
    _make_event(session, organizer=organizer, location=location, city=city, status=EventStatus.pending, title="Pendiente")
    _make_event(session, organizer=organizer, location=location, city=city, status=EventStatus.approved, title="Aprobado")

    response = await client.get("/api/admin/events?status=pending", headers=admin_token_headers)

    assert response.status_code == 200
    titles = {e["title"] for e in response.json()}
    assert titles == {"Pendiente"}


async def test_post_admin_users_creates_user_with_created_by(
    client: AsyncClient, city: City, admin: User, admin_token_headers: dict[str, str]
):
    payload = {
        "email": "cliente-banner@sesale.com.ar",
        "password": "Password123!",
        "public_name": "Cliente Banner",
        "full_name": "Cliente Banner SA",
        "city_id": str(city.id),
        "role": "user",
    }

    response = await client.post("/api/admin/users", json=payload, headers=admin_token_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == payload["email"]
    assert body["created_by"] == str(admin.id)


async def test_post_admin_users_with_is_verified_true_creates_verified_active_user(
    client: AsyncClient, city: City, admin_token_headers: dict[str, str]
):
    """Etapa 9d — el admin ya confirmó la identidad de la persona por fuera
    del sistema: la cuenta nace directamente verificada."""
    payload = {
        "email": "verificado-al-crear@sesale.com.ar",
        "password": "Password123!",
        "public_name": "Cliente Verificado",
        "full_name": "Cliente Verificado SA",
        "city_id": str(city.id),
        "role": "user",
        "is_verified": True,
    }

    response = await client.post("/api/admin/users", json=payload, headers=admin_token_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["is_verified"] is True
    assert body["is_active"] is True
    assert body["email_verified"] is True


async def test_post_admin_users_without_is_verified_defaults_to_unverified(
    client: AsyncClient, city: City, admin_token_headers: dict[str, str]
):
    payload = {
        "email": "sin-verificar@sesale.com.ar",
        "password": "Password123!",
        "public_name": "Cliente Sin Verificar",
        "full_name": "Cliente Sin Verificar",
        "city_id": str(city.id),
        "role": "user",
    }

    response = await client.post("/api/admin/users", json=payload, headers=admin_token_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["is_verified"] is False
    assert body["email_verified"] is False


async def test_post_admin_users_as_non_admin_returns_403(client: AsyncClient, city: City, user_token_headers: dict[str, str]):
    payload = {
        "email": "otra-cuenta@sesale.com.ar",
        "password": "Password123!",
        "public_name": "Otra Cuenta",
        "full_name": "Otra Cuenta",
        "city_id": str(city.id),
        "role": "user",
    }

    response = await client.post("/api/admin/users", json=payload, headers=user_token_headers)

    assert response.status_code == 403
