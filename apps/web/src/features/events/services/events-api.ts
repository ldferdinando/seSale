import { apiGet, apiPatch, apiPost, apiPut } from "@/lib/api-client";
import type {
  Event,
  EventCreateInput,
  EventDetail,
  EventFiltersState,
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

export async function fetchStats(): Promise<EventStats> {
  return apiGet<EventStats>("/api/stats");
}
