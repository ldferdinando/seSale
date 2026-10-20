import { apiDelete, apiGet, apiPatch, apiPost, apiPostFile, apiPut } from "@/lib/api-client";
import type {
  AdminEvent,
  AdminEventFilters,
  Event,
  EventCreateInput,
  EventDetail,
  EventFeaturedUpdateInput,
  EventFiltersState,
  EventPlan,
  EventStats,
  EventStatus,
  EventsByStatus,
  EventUpdateInput,
} from "@/features/events/types";
import { localTimeToUtc } from "@/lib/date-helpers";

export async function fetchEvents(filters: EventFiltersState): Promise<Event[]> {
  return apiGet<Event[]>("/api/events", {
    city_id: filters.cityId,
    category: filters.category,
    moment: filters.moment,
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    search: filters.search,
    ticket_type: filters.ticketType,
  });
}

/**
 * `date`/`time`/`time_end`/`date_end` en el payload vienen en hora
 * argentina (lo que eligió el usuario en el formulario). Contrato del
 * backend (`app/core/timezone.py`): `date`/`date_end` son el DÍA DE NEGOCIO
 * en Argentina y viajan tal cual; solo `time`/`time_end` se convierten a
 * UTC ("HH:mm").
 *
 * Bug real de producción (ver a_revisar.md): el fix de la Etapa 10d
 * mandaba `date`/`date_end` ajustados a la fecha UTC, así que un evento del
 * sábado 17/10 a las 22:00 ART se guardaba como domingo 18/10 — y aparecía
 * en el chip del día equivocado. El backend ya no combina fecha y hora como
 * si ambas fueran UTC (`event_local_datetime`), así que no hace falta
 * correr la fecha.
 *
 * `time_end` vacío (hora de fin opcional) viaja como `null`, para que una
 * edición pueda quitar una hora de fin ya guardada.
 */
function toUtcPayload<
  T extends { date?: string; time?: string; time_end?: string | null; date_end?: string },
>(input: T): T {
  if (!input.date || !input.time) return input;
  const referenceEndDate = input.date_end || input.date;
  return {
    ...input,
    time: localTimeToUtc(input.date, input.time),
    ...("time_end" in input
      ? { time_end: input.time_end ? localTimeToUtc(referenceEndDate, input.time_end) : null }
      : {}),
  };
}

export async function createEvent(input: EventCreateInput): Promise<Event> {
  return apiPost<Event>("/api/events", toUtcPayload(input));
}

/** Feature "Duplicar evento" — crea una copia nueva (nueva fecha/hora,
 * resto de los datos editables) vinculada al evento `eventId` vía
 * `instance_group_id`. Ver POST /api/events/{id}/duplicate. */
export async function duplicateEvent(eventId: string, input: EventCreateInput): Promise<Event> {
  return apiPost<Event>(`/api/events/${eventId}/duplicate`, toUtcPayload(input));
}

export async function fetchMyEvents(): Promise<EventsByStatus> {
  return apiGet<EventsByStatus>("/api/events/mine");
}

export async function fetchEventById(eventId: string): Promise<EventDetail> {
  return apiGet<EventDetail>(`/api/events/${eventId}`);
}

export async function updateEvent(eventId: string, input: EventUpdateInput): Promise<Event> {
  return apiPut<Event>(`/api/events/${eventId}`, toUtcPayload(input));
}

export async function updateEventStatus(eventId: string, status: EventStatus): Promise<Event> {
  return apiPatch<Event>(`/api/events/${eventId}/status`, { status });
}

export async function updateEventFeatured(
  eventId: string,
  input: EventFeaturedUpdateInput,
): Promise<Event> {
  return apiPatch<Event>(`/api/events/${eventId}/featured`, input);
}

export async function updateEventPlan(eventId: string, plan: EventPlan): Promise<Event> {
  return apiPatch<Event>(`/api/events/${eventId}/plan`, { plan });
}

export async function fetchStats(): Promise<EventStats> {
  return apiGet<EventStats>("/api/stats");
}

export async function deleteEvent(eventId: string): Promise<void> {
  return apiDelete<void>(`/api/events/${eventId}`);
}

export interface FlyerUploadResponse {
  flyer_url: string | null;
}

/** Etapa "Diseño v3" — flyer único (4:5), reemplaza al flyer dual de la
 * Etapa 12b. Para el organizador dueño sigue siendo exclusivo del plan
 * Destacado Plus; el admin puede subir con cualquier plan (lo valida el
 * backend). */
export async function uploadEventFlyer(eventId: string, file: File): Promise<FlyerUploadResponse> {
  return apiPostFile<FlyerUploadResponse>(`/api/events/${eventId}/flyer`, file);
}

export async function deleteEventFlyer(eventId: string): Promise<FlyerUploadResponse> {
  return apiDelete<FlyerUploadResponse>(`/api/events/${eventId}/flyer`);
}

export async function fetchAdminEvents(filters: AdminEventFilters): Promise<AdminEvent[]> {
  return apiGet<AdminEvent[]>("/api/admin/events", {
    status: filters.status,
    city_id: filters.city_id,
    category: filters.category,
    plan: filters.plan,
    search: filters.search,
    date_from: filters.date_from,
    date_to: filters.date_to,
    organizer_id: filters.organizer_id,
    instance_group_id: filters.instance_group_id,
    include_deleted: filters.include_deleted ? "true" : undefined,
  });
}
