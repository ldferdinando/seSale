"""Carga datos de prueba en la base de datos configurada por DATABASE_URL.

Uso: uv run python seed.py
"""

from datetime import date, datetime, time, timedelta, timezone

from sqlmodel import Session, SQLModel, delete

from app.core.deps import engine
from app.core.moment import calculate_moments
from app.core.security import hash_password
from app.models import (
    AdSlot,
    City,
    Event,
    EventCategory,
    EventMoment,
    EventStatus,
    Location,
    Plan,
    PlanPrice,
    PlanType,
    Report,
    Subscription,
    User,
)
from app.models.event import TicketType
from app.models.plan import PricingType

SEED_PASSWORD = "Password123!"


def _wipe(session: Session) -> None:
    for model in (Subscription, PlanPrice, Plan, Report, EventCategory, EventMoment, Event, AdSlot, Location, User, City):
        session.exec(delete(model))
    session.commit()


def seed() -> None:
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        _wipe(session)

        general_roca = City(
            name="General Roca",
            province="Río Negro",
            emoji="🏙️",
            latitude=-39.0333,
            longitude=-67.5833,
            is_active=True,
            sort_order=1,
        )
        cipolletti = City(
            name="Cipolletti",
            province="Río Negro",
            emoji="🌆",
            latitude=-38.9333,
            longitude=-68.0000,
            is_active=True,
            sort_order=2,
        )
        proximamente = [
            City(
                name="Neuquén",
                province="Neuquén",
                emoji="🏔️",
                latitude=-38.9516,
                longitude=-68.0591,
                is_active=False,
                sort_order=3,
            ),
            City(
                name="Allen",
                province="Río Negro",
                emoji="🍎",
                latitude=-38.9833,
                longitude=-67.8333,
                is_active=False,
                sort_order=4,
            ),
            City(
                name="Villa Regina",
                province="Río Negro",
                emoji="🌿",
                latitude=-39.1000,
                longitude=-67.0667,
                is_active=False,
                sort_order=5,
            ),
            City(
                name="Cinco Saltos",
                province="Río Negro",
                emoji="💧",
                latitude=-38.8167,
                longitude=-68.0667,
                is_active=False,
                sort_order=6,
            ),
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
            hashed_password=hash_password(SEED_PASSWORD),
            full_name="Juan Pérez",
            public_name="El Tinglado Bar",
            city_id=general_roca.id,
            is_verified=True,
        )
        admin = User(
            email="admin@sesale.com.ar",
            hashed_password=hash_password(SEED_PASSWORD),
            role="admin",
            full_name="Admin seSALE",
            public_name="Admin seSALE",
            city_id=general_roca.id,
            is_verified=True,
        )
        session.add(organizer)
        session.add(admin)
        session.commit()
        session.refresh(organizer)
        session.refresh(admin)

        today = date.today()

        events_data = [
            dict(title="Noche de Rock Nacional", categories=["musica", "recital"], plan=PlanType.pro, days_offset=3, location=locations[0], time=time(21, 0)),
            dict(title="Feria de Artesanos del Valle", categories=["feria"], plan=PlanType.dest, days_offset=5, location=locations[2], time=time(11, 0), time_end=time(19, 0)),
            dict(title="Obra: La Casa de Bernarda Alba", categories=["teatro"], plan=PlanType.gratis, days_offset=7, location=locations[1], time=time(20, 30)),
            dict(title="Fiesta Electrónica Under", categories=["dj", "fiesta"], plan=PlanType.dest, days_offset=10, location=locations[0], time=time(23, 0)),
            dict(title="Milonga de los Jueves", categories=["milonga"], plan=PlanType.gratis, days_offset=1, location=locations[1], time=time(18, 0), time_end=time(22, 0)),
            dict(title="Stand Up: Risas del Alto Valle", categories=["standup"], plan=PlanType.pro, days_offset=14, location=locations[0], time=time(21, 30)),
            dict(title="Recital Solidario", categories=["recital", "musica"], plan=PlanType.gratis, days_offset=-2, location=locations[2], time=time(17, 0)),
            dict(title="Peña Folclórica de Otoño", categories=["pena", "musica", "fiesta"], plan=PlanType.dest, days_offset=-10, location=locations[1], time=time(21, 0)),
        ]

        for data in events_data:
            event_date = today + timedelta(days=data["days_offset"])
            event_time = data["time"]
            event_time_end = data.get("time_end")
            event = Event(
                city_id=general_roca.id,
                organizer_id=organizer.id,
                location_id=data["location"].id,
                title=data["title"],
                description=f"Evento de prueba: {data['title']}",
                date=event_date,
                time=event_time,
                time_end=event_time_end,
                status=EventStatus.approved,
                plan=data["plan"],
                ticket_type=TicketType.gratis,
                created_at=datetime.now(timezone.utc) - timedelta(days=data["days_offset"]),
            )
            session.add(event)
            session.flush()

            for category in data["categories"]:
                session.add(EventCategory(event_id=event.id, category=category))
            for moment in calculate_moments(event_time, event_time_end):
                session.add(EventMoment(event_id=event.id, moment=moment))

        ad_slots = [
            AdSlot(slot_key="home-0", city_id=general_roca.id, is_active=False, sort_order=0),
            AdSlot(slot_key="home-1", city_id=general_roca.id, is_active=False, sort_order=1),
            AdSlot(slot_key="home-2", city_id=general_roca.id, is_active=False, sort_order=2),
        ]
        for ad_slot in ad_slots:
            session.add(ad_slot)

        plans = [
            Plan(name="Gratuito", plan_type=PlanType.gratis, pricing_type=PricingType.fixed, description="1 evento · básico · sin prioridad"),
            Plan(name="Destacado", plan_type=PlanType.dest, pricing_type=PricingType.fixed, description="Ilimitado · fondo destacado · 2° prioridad"),
            Plan(name="Destacado Plus", plan_type=PlanType.pro, pricing_type=PricingType.fixed, description="Imagen · banner · stats · 1° prioridad"),
            Plan(name="Banner web", plan_type=PlanType.banner, pricing_type=PricingType.custom, description="Home + categorías · máxima visibilidad"),
        ]
        for plan in plans:
            session.add(plan)
        session.commit()
        for plan in plans:
            session.refresh(plan)

        plan_prices = [
            PlanPrice(plan_id=plans[0].id, amount=0, valid_from=today, created_by=admin.id),
            PlanPrice(plan_id=plans[1].id, amount=3500, valid_from=today, created_by=admin.id, promo_label="Promo lanzamiento"),
            PlanPrice(plan_id=plans[2].id, amount=6500, valid_from=today, created_by=admin.id, promo_label="Promo lanzamiento"),
        ]
        for price in plan_prices:
            session.add(price)

        session.commit()
        print("Seed completo: 6 ciudades, 3 ubicaciones, 8 eventos, 2 usuarios, 3 ad slots, 4 planes.")
        print(f"  Login organizador: organizador@sesale.com.ar / {SEED_PASSWORD}")
        print(f"  Login admin:       admin@sesale.com.ar / {SEED_PASSWORD}")


if __name__ == "__main__":
    seed()
