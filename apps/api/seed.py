"""Carga datos de prueba en la base de datos configurada por DATABASE_URL.

Uso: uv run python seed.py
"""

from datetime import date, datetime, time, timedelta, timezone

from sqlmodel import Session, SQLModel, delete

from app.core.deps import engine
from app.models import AdSlot, City, Event, EventPlan, EventStatus, Location, Subscription, User
from app.models.event import TicketType


def _wipe(session: Session) -> None:
    for model in (Subscription, Event, AdSlot, Location, User, City):
        session.exec(delete(model))
    session.commit()


def seed() -> None:
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        _wipe(session)

        general_roca = City(name="General Roca", province="Río Negro", emoji="🌳", is_active=True, sort_order=1)
        cipolletti = City(name="Cipolletti", province="Río Negro", emoji="🏙️", is_active=True, sort_order=2)
        proximamente = [
            City(name="Neuquén", province="Neuquén", emoji="🏙️", is_active=False, sort_order=3),
            City(name="Villa Regina", province="Río Negro", emoji="🍑", is_active=False, sort_order=4),
            City(name="Allen", province="Río Negro", emoji="🍇", is_active=False, sort_order=5),
            City(name="Cinco Saltos", province="Río Negro", emoji="🌊", is_active=False, sort_order=6),
            City(name="Fernández Oro", province="Río Negro", emoji="🌾", is_active=False, sort_order=7),
        ]
        session.add(general_roca)
        session.add(cipolletti)
        for city in proximamente:
            session.add(city)
        session.commit()
        session.refresh(general_roca)
        session.refresh(cipolletti)

        locations = [
            Location(name="El Tinglado Bar", address="Av. Roca 1240", city_id=general_roca.id),
            Location(name="Centro Cultural Roca", address="Alsina 750", city_id=general_roca.id),
            Location(name="Predio Ferial", address="Ruta 22 km 1210", city_id=general_roca.id),
        ]
        for loc in locations:
            session.add(loc)
        session.commit()
        for loc in locations:
            session.refresh(loc)

        organizer = User(
            email="organizador@sesale.com.ar",
            full_name="Juan Pérez",
            public_name="El Tinglado Bar",
            city_id=general_roca.id,
            is_verified=True,
        )
        session.add(organizer)
        session.commit()
        session.refresh(organizer)

        today = date.today()

        events_data = [
            dict(title="Noche de Rock Nacional", category="musica", plan=EventPlan.pro, days_offset=3, location=locations[0]),
            dict(title="Feria de Artesanos del Valle", category="feria", plan=EventPlan.dest, days_offset=5, location=locations[2]),
            dict(title="Obra: La Casa de Bernarda Alba", category="teatro", plan=EventPlan.gratis, days_offset=7, location=locations[1]),
            dict(title="Fiesta Electrónica Under", category="dj", plan=EventPlan.dest, days_offset=10, location=locations[0]),
            dict(title="Milonga de los Jueves", category="milonga", plan=EventPlan.gratis, days_offset=1, location=locations[1]),
            dict(title="Stand Up: Risas del Alto Valle", category="standup", plan=EventPlan.pro, days_offset=14, location=locations[0]),
            dict(title="Recital Solidario", category="recital", plan=EventPlan.gratis, days_offset=-2, location=locations[2]),
            dict(title="Peña Folclórica de Otoño", category="pena", plan=EventPlan.dest, days_offset=-10, location=locations[1]),
        ]

        for data in events_data:
            event_date = today + timedelta(days=data["days_offset"])
            event = Event(
                city_id=general_roca.id,
                organizer_id=organizer.id,
                location_id=data["location"].id,
                title=data["title"],
                description=f"Evento de prueba: {data['title']}",
                date=event_date,
                time=time(21, 0),
                category=data["category"],
                status=EventStatus.approved,
                plan=data["plan"],
                ticket_type=TicketType.gratis,
                created_at=datetime.now(timezone.utc) - timedelta(days=data["days_offset"]),
            )
            session.add(event)

        session.commit()
        print("Seed completo: 7 ciudades, 3 ubicaciones, 8 eventos.")


if __name__ == "__main__":
    seed()
