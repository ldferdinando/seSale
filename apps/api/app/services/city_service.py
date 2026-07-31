from sqlmodel import Session, select

from app.models.city import City


def list_active_cities(session: Session) -> list[City]:
    stmt = select(City).where(City.is_active == True).order_by(City.sort_order)  # noqa: E712
    return list(session.exec(stmt))
