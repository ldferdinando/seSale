import type { Event, EventLocation } from "@/features/events/types";

/**
 * Texto corto de "dónde es" el evento: el nombre del Location vinculado o,
 * si el evento usa dirección libre (`location_text`), esa dirección.
 */
export function eventPlaceLabel(event: Pick<Event, "location" | "location_text">): string {
  return event.location?.name ?? event.location_text ?? "";
}

/**
 * Google Maps: navegación directa por coordenadas si existen, si no
 * búsqueda por dirección. Mismo criterio que `buildMapUrl` en
 * GastroPlaceCard.tsx/GastroDetailView.tsx (Etapa 10b-1). Con dirección
 * libre (`location_text`, sin coordenadas) siempre es una búsqueda de texto;
 * se le suma la ciudad del evento si el texto no la menciona, porque "Mitre
 * 1234" solo es ambiguo entre ciudades del Alto Valle.
 */
export function buildEventMapUrl(
  location: Pick<EventLocation, "latitude" | "longitude" | "address"> | null,
  locationText: string | null,
  cityName?: string,
): string | null {
  if (location) {
    if (location.latitude != null && location.longitude != null) {
      return `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
    }
    if (location.address) {
      return `https://www.google.com/maps/search/${encodeURIComponent(location.address)}`;
    }
    return null;
  }
  if (locationText) {
    const mentionsCity = cityName ? locationText.toLowerCase().includes(cityName.toLowerCase()) : true;
    const query = mentionsCity ? locationText : `${locationText}, ${cityName}`;
    return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  }
  return null;
}
