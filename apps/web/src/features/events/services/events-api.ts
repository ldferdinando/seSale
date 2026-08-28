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
import { localDateTimeToUtc } from "@/lib/date-helpers";

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
 * argentina (lo que tipeó el usuario en el formulario). La API guarda
 * `time`/`time_end` en UTC — esta es la única conversión antes de
 * mandarlos, para que quede consistente con `formatEventTime` (que asume
 * que lo que devuelve la API ya es UTC).
 *
 * `date`/`date_end` representan el día de negocio en Argentina, pero el
 * backend los combina directamente con `time`/`time_end` como si ya
 * estuvieran en UTC (`datetime.combine(date_end, time_end,
 * tzinfo=timezone.utc)` en event_service.py) — así que acá tienen que
 * viajar ya ajustados a la fecha UTC real. Bug real reportado (Etapa
 * 10d): para horas ART >= 21:00 la conversión a UTC cruza medianoche
 * (Argentina es UTC-3 constante, sin horario de verano) y si `date`/
 * `date_end` no se corrigen quedan un día atrás de lo que corresponde
 * (ej. 28/08 22:00 ART -> se mandaba date_end=28/08 + time_end=01:00 UTC,
 * que combinados dan 28/08 01:00 UTC = 27/08 22:00 ART, anterior al
 * inicio). Cada límite (inicio/fin) se ajusta con su propia fecha de
 * referencia — `date` para `time`, `date_end` para `time_end` — no la
 * misma fecha para ambos, porque un evento de varios días puede tener
 * `date_end` distinto de `date`.
 */
function toUtcPayload<T extends { date?: string; time?: string; time_end?: string; date_end?: string }>(
  input: T,
): T {
  if (!input.date || !input.time) return input;
  const start = localDateTimeToUtc(input.date, input.time);
  const end =
    input.time_end && input.date_end ? localDateTimeToUtc(input.date_end, input.time_end) : undefined;
  return {
    ...input,
    date: start.date,
    time: start.time,
    ...(end ? { date_end: end.date, time_end: end.time } : {}),
  };
}

export async function createEvent(input: EventCreateInput): Promise<Event> {
  return apiPost<Event>("/api/events", toUtcPayload(input));
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
  flyer_url_desktop: string | null;
  flyer_url_mobile: string | null;
}

export type FlyerSize = "desktop" | "mobile";

/** Etapa 12b — flyer dual. Para el organizador dueño sigue siendo exclusivo
 * del plan Destacado Plus; el admin puede subir con cualquier plan (lo
 * valida el backend). */
export async function uploadEventFlyer(
  eventId: string,
  size: FlyerSize,
  file: File,
): Promise<FlyerUploadResponse> {
  return apiPostFile<FlyerUploadResponse>(`/api/events/${eventId}/flyer/${size}`, file);
}

export async function deleteEventFlyer(eventId: string, size: FlyerSize): Promise<FlyerUploadResponse> {
  return apiDelete<FlyerUploadResponse>(`/api/events/${eventId}/flyer/${size}`);
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
  });
}
