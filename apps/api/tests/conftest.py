from collections.abc import AsyncGenerator, Generator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.core.deps import get_session
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models import City, Location, User


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
