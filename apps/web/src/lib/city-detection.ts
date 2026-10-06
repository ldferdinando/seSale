import type { City } from "@/features/auth/types";

/** Etapa 7a — detección y persistencia de la ciudad activa del usuario. */

export const CITY_STORAGE_KEY = "sesale_selected_city_id";
export const MAX_DISTANCE_KM = 200;
export const GEOLOCATION_TIMEOUT_MS = 5000;
/** Ciudad por defecto de la app (mismo criterio que el metadata de /categorias/[key]). */
export const DEFAULT_CITY_NAME = "General Roca";

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
 * Ciudad por defecto mientras no haya una guardada ni detectada por GPS:
 * `defaultCityName` si está activa, si no la primera ciudad activa
 * (`GET /api/cities` ya viene ordenado por `sort_order`).
 *
 * Precondición: `cities` no está vacío.
 */
export function getDefaultCity(cities: City[], defaultCityName: string = DEFAULT_CITY_NAME): City {
  const activeCities = cities.filter((city) => city.is_active);
  return activeCities.find((city) => city.name === defaultCityName) ?? activeCities[0] ?? cities[0];
}

/** Ciudad guardada en localStorage, si sigue existiendo en `cities`. */
export function findSavedCity(cities: City[]): City | null {
  const savedId = getSavedCityId();
  if (!savedId) return null;
  return cities.find((city) => city.id === savedId) ?? null;
}

/**
 * Ciudad activa más cercana a la ubicación del usuario por GPS. `null` si no
 * hay GPS, se rechaza el permiso, vence el timeout o ninguna ciudad está a
 * menos de `MAX_DISTANCE_KM`. No bloquea la UI: el caller ya muestra la
 * ciudad por defecto mientras esto resuelve (ver ActiveCityProvider).
 */
export async function detectCityByLocation(cities: City[]): Promise<City | null> {
  const coords = await requestUserLocation();
  return coords ? findNearestCity(coords.latitude, coords.longitude, cities) : null;
}
