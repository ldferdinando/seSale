from uuid import UUID

from sqlmodel import Session, select

from app.core.security import hash_password
from app.models.user import User


def get_user(session: Session, user_id: UUID) -> User:
    user = session.get(User, user_id)
    if user is None:
        raise LookupError("Usuario no encontrado")
    return user


def list_users(session: Session, *, limit: int = 50, offset: int = 0) -> list[User]:
    return list(session.exec(select(User).offset(offset).limit(limit)))


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
