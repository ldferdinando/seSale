/**
 * Encapsula las llamadas a Nominatim (OpenStreetMap) para geocoding y
 * reverse geocoding — Etapa 7b. Gratis, sin API key, pero con un rate limit
 * estricto de 1 request/segundo: el debounce de 1000ms se aplica del lado
 * del que llama (`MapPicker.tsx`), no acá — estas funciones son fetches
 * directos, sin cola ni throttle propio.
 *
 * `countrycodes=ar` siempre se manda para priorizar resultados de
 * Argentina (seSALE opera en el Alto Valle de la Patagonia).
 */

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

export interface NominatimAddress {
  road?: string;
  house_number?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  country?: string;
}

export interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address: NominatimAddress;
}

/**
 * Busca una dirección por texto y devuelve los primeros resultados.
 * `cityName` es un hint opcional para mejorar la precisión (se agrega al
 * query, no es un filtro estricto — Nominatim no lo garantiza).
 */
export async function searchAddress(query: string, cityName?: string): Promise<NominatimResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const q = cityName ? `${trimmed}, ${cityName}` : trimmed;
  const url = new URL(`${NOMINATIM_BASE_URL}/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "ar");
  url.searchParams.set("limit", "5");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return [];
  return (await response.json()) as NominatimResult[];
}

/** Convierte coordenadas a dirección (reverse geocoding). */
export async function reverseGeocode(lat: number, lng: number): Promise<NominatimResult | null> {
  const url = new URL(`${NOMINATIM_BASE_URL}/reverse`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "ar");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  const body = await response.json();
  if (!body || body.error) return null;
  return body as NominatimResult;
}
