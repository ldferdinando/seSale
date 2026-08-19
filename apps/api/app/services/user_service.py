from uuid import UUID

from sqlalchemy import func
from sqlmodel import Session, select

from app.core.security import hash_password
from app.models.city import City
from app.models.event import Event
from app.models.user import User
from app.schemas.user import UserAdminRead


def get_user(session: Session, user_id: UUID) -> User:
    user = session.get(User, user_id)
    if user is None:
        raise LookupError("Usuario no encontrado")
    return user


def list_users(session: Session, *, limit: int = 50, offset: int = 0) -> list[User]:
    return list(session.exec(select(User).offset(offset).limit(limit)))


def list_users_admin(
    session: Session,
    *,
    search: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
    city_id: UUID | None = None,
) -> list[UserAdminRead]:
    """Etapa 9b — listado completo para el panel admin, sin paginación (la
    cantidad de usuarios en desarrollo es manejable). Orden: created_at DESC.

    `city_name` y `event_count` no viven en `User` — se resuelven acá con un
    join a `City` y una query agregada por `organizer_id` (batched, sin
    N+1: una sola query de conteo para todos los usuarios del resultado)."""
    stmt = select(User)
    if role is not None:
        stmt = stmt.where(User.role == role)
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)
    if city_id is not None:
        stmt = stmt.where(User.city_id == city_id)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            (User.email.ilike(pattern))
            | (User.full_name.ilike(pattern))
            | (User.public_name.ilike(pattern))
        )
    stmt = stmt.order_by(User.created_at.desc())
    users = list(session.exec(stmt))

    city_names: dict[UUID, str] = {}
    city_ids = {user.city_id for user in users if user.city_id is not None}
    if city_ids:
        cities = session.exec(select(City).where(City.id.in_(city_ids))).all()
        city_names = {city.id: city.name for city in cities}

    event_counts: dict[UUID, int] = {}
    user_ids = [user.id for user in users]
    if user_ids:
        rows = session.exec(
            select(Event.organizer_id, func.count(Event.id))
            .where(Event.organizer_id.in_(user_ids))
            .group_by(Event.organizer_id)
        ).all()
        event_counts = dict(rows)

    return [
        UserAdminRead(
            **user.model_dump(),
            city_name=city_names.get(user.city_id) if user.city_id else None,
            event_count=event_counts.get(user.id, 0),
        )
        for user in users
    ]


def update_user_role(session: Session, user_id: UUID, role: str) -> User:
    user = get_user(session, user_id)
    user.role = role
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def update_user_active(session: Session, user_id: UUID, is_active: bool) -> User:
    user = get_user(session, user_id)
    user.is_active = is_active
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def update_user(session: Session, user: User, updates: dict) -> User:
    for field, value in updates.items():
        setattr(user, field, value)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def verify_user(session: Session, user_id: UUID) -> User:
    user = get_user(session, user_id)
    user.is_verified = True
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def create_user_by_admin(
    session: Session,
    *,
    admin_id: UUID,
    email: str,
    password: str,
    public_name: str,
    full_name: str,
    city_id: UUID | None,
    role: str,
    doc_type: str | None,
    doc_number: str | None,
    phone: str | None,
) -> User:
    """Crea una cuenta en nombre de un cliente (ej. de banner). Registra
    `created_by` con el id del admin autenticado."""
    existing = session.exec(select(User).where(User.email == email)).first()
    if existing is not None:
        raise ValueError("El email ya está registrado")

    user = User(
        email=email,
        hashed_password=hash_password(password),
        role=role,
        full_name=full_name,
        doc_type=doc_type,
        doc_number=doc_number,
        phone=phone,
        public_name=public_name,
        city_id=city_id,
        created_by=admin_id,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
