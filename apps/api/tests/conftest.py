from collections.abc import AsyncGenerator, Generator
from datetime import date

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.core.deps import get_session
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models import City, Location, Plan, PlanPrice, PlanType, User
from app.models.plan import PricingType


@pytest.fixture(name="session")
def session_fixture() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
async def client_fixture(session: Session) -> AsyncGenerator[AsyncClient, None]:
    def get_session_override() -> Generator[Session, None, None]:
        yield session

    app.dependency_overrides[get_session] = get_session_override

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture(name="city")
def city_fixture(session: Session) -> City:
    city = City(name="General Roca", province="Río Negro", is_active=True)
    session.add(city)
    session.commit()
    session.refresh(city)
    return city


@pytest.fixture(name="organizer")
def organizer_fixture(session: Session, city: City) -> User:
    user = User(
        email="organizador@sesale.com.ar",
        hashed_password=hash_password("Password123!"),
        full_name="Juan Pérez",
        public_name="El Tinglado Bar",
        city_id=city.id,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="admin")
def admin_fixture(session: Session, city: City) -> User:
    user = User(
        email="admin@sesale.com.ar",
        hashed_password=hash_password("AdminPass123!"),
        role="admin",
        full_name="Admin seSALE",
        public_name="Admin seSALE",
        city_id=city.id,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="user_token_headers")
def user_token_headers_fixture(organizer: User) -> dict[str, str]:
    token = create_access_token(organizer.id, organizer.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(name="admin_token_headers")
def admin_token_headers_fixture(admin: User) -> dict[str, str]:
    token = create_access_token(admin.id, admin.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(name="location")
def location_fixture(session: Session, city: City) -> Location:
    location = Location(name="El Tinglado Bar", address="Av. Roca 1240", city_id=city.id)
    session.add(location)
    session.commit()
    session.refresh(location)
    return location


@pytest.fixture(name="plan_gratis")
def plan_gratis_fixture(session: Session, admin: User) -> Plan:
    plan = Plan(name="Gratuito", plan_type=PlanType.gratis, pricing_type=PricingType.fixed, is_active=True)
    session.add(plan)
    session.commit()
    session.refresh(plan)
    session.add(PlanPrice(plan_id=plan.id, amount=0, valid_from=date.today(), created_by=admin.id))
    session.commit()
    return plan


@pytest.fixture(name="plan_banner")
def plan_banner_fixture(session: Session) -> Plan:
    plan = Plan(name="Banner web", plan_type=PlanType.banner, pricing_type=PricingType.custom, is_active=True)
    session.add(plan)
    session.commit()
    session.refresh(plan)
    return plan


@pytest.fixture(name="plan_dest")
def plan_dest_fixture(session: Session) -> Plan:
    plan = Plan(name="Destacado", plan_type=PlanType.dest, pricing_type=PricingType.fixed, is_active=True)
    session.add(plan)
    session.commit()
    session.refresh(plan)
    return plan


@pytest.fixture(name="plan_price_dest")
def plan_price_dest_fixture(session: Session, plan_dest: Plan, admin: User) -> PlanPrice:
    price = PlanPrice(
        plan_id=plan_dest.id,
        amount=3500,
        valid_from=date.today(),
        created_by=admin.id,
        promo_label="Promo lanzamiento",
    )
    session.add(price)
    session.commit()
    session.refresh(price)
    return price


class FakePreferenceAPI:
    def __init__(self, sdk: "FakeMPSDK") -> None:
        self.sdk = sdk

    def create(self, data: dict) -> dict:
        self.sdk.last_preference_data = data
        return {"response": {"id": self.sdk.preference_id, "init_point": self.sdk.init_point}}


class FakePaymentAPI:
    def __init__(self, sdk: "FakeMPSDK") -> None:
        self.sdk = sdk

    def get(self, payment_id: str) -> dict:
        self.sdk.last_payment_id_requested = payment_id
        return {"response": self.sdk.payment_response}


class FakeMPSDK:
    """Sustituto del SDK oficial de MercadoPago para tests: nunca llama a la red."""

    def __init__(self) -> None:
        self.preference_id = "pref-123"
        self.init_point = "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-123"
        self.payment_response: dict = {}
        self.last_preference_data: dict | None = None
        self.last_payment_id_requested: str | None = None

    def preference(self) -> FakePreferenceAPI:
        return FakePreferenceAPI(self)

    def payment(self) -> FakePaymentAPI:
        return FakePaymentAPI(self)


@pytest.fixture(name="fake_mp_sdk")
def fake_mp_sdk_fixture(monkeypatch: pytest.MonkeyPatch) -> FakeMPSDK:
    sdk = FakeMPSDK()
    monkeypatch.setattr("app.services.payment_service._get_mp_sdk", lambda: sdk)
    return sdk
