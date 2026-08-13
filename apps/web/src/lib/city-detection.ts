import type { City } from "@/features/auth/types";

/** Etapa 7a — detección y persistencia de la ciudad activa del usuario. */

export const CITY_STORAGE_KEY = "sesale_selected_city_id";
export const MAX_DISTANCE_KM = 200;
export const GEOLOCATION_TIMEOUT_MS = 5000;

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Distancia en km entre dos coordenadas, fórmula de Haversine. */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Ciudad activa más cercana a las coordenadas dadas. Ignora ciudades
 * inactivas o sin coordenadas cargadas. `null` si no hay ninguna a menos de
 * `MAX_DISTANCE_KM`.
 */
export function findNearestCity(latitude: number, longitude: number, cities: City[]): City | null {
  const candidates = cities.filter(
    (city) => city.is_active && city.latitude != null && city.longitude != null,
  );

  let nearest: City | null = null;
  let nearestDistance = Infinity;

  for (const city of candidates) {
    const distance = haversineDistance(latitude, longitude, city.latitude as number, city.longitude as number);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = city;
    }
  }

  if (nearest === null || nearestDistance > MAX_DISTANCE_KM) return null;
  return nearest;
}

/**
 * Coordenadas del usuario vía `navigator.geolocation`. `null` si el browser
 * no lo soporta, el usuario rechaza el permiso, o no responde dentro de
 * `GEOLOCATION_TIMEOUT_MS`.
 */
export async function requestUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    let settled = false;

    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, GEOLOCATION_TIMEOUT_MS);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve(null);
      },
      { timeout: GEOLOCATION_TIMEOUT_MS },
    );
  });
}

export function saveSelectedCity(cityId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CITY_STORAGE_KEY, cityId);
}

export function getSavedCityId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CITY_STORAGE_KEY);
}

export function clearSavedCity(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CITY_STORAGE_KEY);
}

/**
 * Detecta la ciudad del usuario, en orden:
 * 1. Ciudad guardada en localStorage → se devuelve sin pedir GPS.
 * 2. GPS disponible y ciudad activa a menos de `MAX_DISTANCE_KM` → esa ciudad.
 * 3. Si no, `defaultCityName` (o la primera ciudad activa si no existe).
 *
 * La ciudad resuelta siempre se persiste en localStorage, para no volver a
 * pedir GPS en la próxima visita.
 *
 * Precondición: `cities` no está vacío (el caller espera a que
 * `GET /api/cities` resuelva antes de llamar a esta función).
 */
export async function detectUserCity(cities: City[], defaultCityName: string = "General Roca"): Promise<City> {
  const activeCities = cities.filter((city) => city.is_active);
  const fallbackCity = activeCities.find((city) => city.name === defaultCityName) ?? activeCities[0] ?? cities[0];

  const savedId = getSavedCityId();
  if (savedId) {
    const saved = cities.find((city) => city.id === savedId);
    if (saved) return saved;
  }

  const coords = await requestUserLocation();
  const detected = coords ? findNearestCity(coords.latitude, coords.longitude, cities) : null;

  const result = detected ?? fallbackCity;
  saveSelectedCity(result.id);
  return result;
}
