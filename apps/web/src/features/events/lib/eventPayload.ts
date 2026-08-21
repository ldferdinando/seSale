import type { EventFormValues } from "@/features/events/schemas/event-schema";
import type { EventCreateInput } from "@/features/events/types";

/**
 * Convierte el payload que se manda a la API de vuelta a valores de
 * formulario (strings) — se usa al volver del resumen al formulario
 * ("Editar") para no perder lo que la persona ya cargó.
 */
export function payloadToFormValues(payload: EventCreateInput): Partial<EventFormValues> {
  return {
    title: payload.title,
    description: payload.description ?? "",
    date: payload.date,
    time: payload.time,
    time_end: payload.time_end ?? "",
    date_end: payload.date_end ?? "",
    categories: payload.categories,
    city_id: payload.city_id ?? "",
    // Etapa 7b: si el payload tenía location_id, la Tab A la vuelve a
    // resolver sola (EventLocationField la trae por id); si tenía
    // location_data, se restauran los campos de la Tab B tal cual.
    location_mode: payload.location_id ? "preset" : "map",
    location_id: payload.location_id ?? "",
    location_name: payload.location_data?.name ?? "",
    location_address: payload.location_data?.address ?? "",
    location_latitude: payload.location_data?.latitude,
    location_longitude: payload.location_data?.longitude,
    ticket_type: payload.ticket_type,
    price_at_door: payload.price_at_door != null ? String(payload.price_at_door) : "",
    price_advance: payload.price_advance != null ? String(payload.price_advance) : "",
    available_on_site: payload.available_on_site ?? false,
    contact_instagram: payload.contact_instagram ?? "",
    contact_web: payload.contact_web ?? "",
    contact_email: payload.contact_email ?? "",
  };
}
