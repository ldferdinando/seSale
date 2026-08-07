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

export async function fetchEvents(filters: EventFiltersState): Promise<Event[]> {
  return apiGet<Event[]>("/api/events", {
    category: filters.category,
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    search: filters.search,
  });
}

export async function createEvent(input: EventCreateInput): Promise<Event> {
  return apiPost<Event>("/api/events", input);
}

export async function fetchMyEvents(): Promise<EventsByStatus> {
  return apiGet<EventsByStatus>("/api/events/mine");
}

export async function fetchEventById(eventId: string): Promise<EventDetail> {
  return apiGet<EventDetail>(`/api/events/${eventId}`);
}

export async function updateEvent(eventId: string, input: EventUpdateInput): Promise<Event> {
  return apiPut<Event>(`/api/events/${eventId}`, input);
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
