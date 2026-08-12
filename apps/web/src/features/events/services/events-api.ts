import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api-client";
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
    category: filters.category,
    moment: filters.moment,
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    search: filters.search,
  });
}

/**
 * `date`/`time`/`time_end` en el payload vienen en hora argentina (lo que
 * tipeó el usuario en el formulario). La API guarda `time`/`time_end` en
 * UTC — esta es la única conversión antes de mandarlos, para que quede
 * consistente con `formatEventTime` (que asume que lo que devuelve la API
 * ya es UTC). `date` no se convierte: es el día de negocio en Argentina.
 */
function toUtcPayload<T extends { date?: string; time?: string; time_end?: string }>(input: T): T {
  if (!input.date || !input.time) return input;
  return {
    ...input,
    time: localTimeToUtc(input.date, input.time),
    time_end: input.time_end ? localTimeToUtc(input.date, input.time_end) : input.time_end,
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

export async function fetchAdminEvents(filters: AdminEventFilters): Promise<AdminEvent[]> {
  return apiGet<AdminEvent[]>("/api/admin/events", {
    status: filters.status,
    city_id: filters.city_id,
    category: filters.category,
    plan: filters.plan,
    search: filters.search,
    date_from: filters.date_from,
    date_to: filters.date_to,
  });
}
