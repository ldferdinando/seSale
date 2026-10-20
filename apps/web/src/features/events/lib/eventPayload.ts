import type { EventFormValues } from "@/features/events/schemas/event-schema";
import type { Event, EventCreateInput } from "@/features/events/types";

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
    // location_data, se restauran los campos de la Tab B tal cual; si
    // tenía location_text, se vuelve al modo de dirección libre.
    location_mode: payload.location_id ? "preset" : payload.location_text ? "text" : "map",
    location_text: payload.location_text ?? "",
    location_id: payload.location_id ?? "",
    location_name: payload.location_data?.name ?? "",
    location_address: payload.location_data?.address ?? "",
    location_latitude: payload.location_data?.latitude,
    location_longitude: payload.location_data?.longitude,
    ticket_type: payload.ticket_type,
    price_mode: payload.price_mode ?? "fixed",
    price_at_door: payload.price_at_door != null ? String(payload.price_at_door) : "",
    price_advance: payload.price_advance != null ? String(payload.price_advance) : "",
    available_on_site: payload.available_on_site ?? false,
    contact_instagram: payload.contact_instagram ?? "",
    contact_web: payload.contact_web ?? "",
    contact_email: payload.contact_email ?? "",
  };
}

/**
 * Feature "Duplicar evento" — precarga el formulario de alta (modo
 * "create") con los datos de un evento ya publicado, para no tener que
 * cargarlo todo de nuevo. Mapeo análogo al de EditarEventoClient.tsx, con
 * dos diferencias deliberadas:
 *
 * - Fecha y hora (date/time/time_end/date_end) quedan VACÍAS a propósito,
 *   no con los valores del original: el Zod schema del formulario exige
 *   los cuatro campos (y que la fecha no sea pasada), así que es imposible
 *   seguir el flujo de alta sin elegir una fecha nueva — evita publicar sin
 *   querer una instancia nueva con la misma fecha que la que se duplicó.
 * - No se precarga ningún flyer: la copia nace sin flyer (no se duplica el
 *   archivo de Storage), el organizador sube uno nuevo si el plan que
 *   elija para esta instancia lo permite.
 */
export function duplicateEventToFormValues(event: Event): Partial<EventFormValues> {
  return {
    title: event.title,
    description: event.description ?? "",
    date: "",
    time: "",
    time_end: "",
    date_end: "",
    categories: event.categories,
    city_id: event.city_id,
    location_mode: event.location_text ? "text" : "preset",
    location_id: event.location_id ?? "",
    location_text: event.location_text ?? "",
    ticket_type: event.ticket_type,
    price_mode: event.price_mode,
    price_at_door: event.price_at_door != null ? String(event.price_at_door) : "",
    price_advance: event.price_advance != null ? String(event.price_advance) : "",
    available_on_site: event.available_on_site,
    contact_whatsapp: event.contact_whatsapp ?? "",
    contact_instagram: event.contact_instagram ?? "",
    contact_facebook: event.contact_facebook ?? "",
    contact_web: event.contact_web ?? "",
    contact_email: event.contact_email ?? "",
  };
}
