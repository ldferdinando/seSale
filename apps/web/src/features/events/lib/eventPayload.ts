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
    categories: payload.categories,
    location_name: payload.location_name,
    location_address: payload.location_address,
    ticket_type: payload.ticket_type,
    price_at_door: payload.price_at_door != null ? String(payload.price_at_door) : "",
    price_advance: payload.price_advance != null ? String(payload.price_advance) : "",
    available_on_site: payload.available_on_site ?? false,
    contact_instagram: payload.contact_instagram ?? "",
    contact_web: payload.contact_web ?? "",
    contact_email: payload.contact_email ?? "",
  };
}
