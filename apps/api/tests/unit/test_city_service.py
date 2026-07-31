from app.models import City
from app.services.city_service import list_active_cities


def test_list_active_cities_excludes_inactive(session, city):
    inactive = City(name="Ciudad Inactiva", province="Río Negro", is_active=False)
    session.add(inactive)
    session.commit()

    cities = list_active_cities(session)

    names = [c.name for c in cities]
    assert city.name in names
    assert "Ciudad Inactiva" not in names
