import { apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { Event, EventCreateInput, EventFiltersState, EventStatus, EventsByStatus } from "@/features/events/types";

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

export async function fetchMyEvents(userId: string): Promise<EventsByStatus> {
  return apiGet<EventsByStatus>("/api/events/mine", { user_id: userId });
}

export async function updateEventStatus(eventId: string, status: EventStatus, adminKey: string): Promise<Event> {
  return apiPatch<Event>(`/api/events/${eventId}/status`, { status }, { "x-admin-key": adminKey });
}
