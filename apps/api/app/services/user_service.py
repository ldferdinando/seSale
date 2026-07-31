from uuid import UUID

from sqlmodel import Session, select

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
