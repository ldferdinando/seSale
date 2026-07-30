import { http, HttpResponse } from "msw";

import type { Event } from "@/features/events/types";

const API_URL = "http://localhost:8000";

export function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    city_id: "22222222-2222-2222-2222-222222222222",
    location_id: "33333333-3333-3333-3333-333333333333",
    title: "Noche de Rock Nacional",
    description: "Un evento de prueba",
    date: "2099-01-01",
    time: "21:00:00",
    category: "musica",
    status: "approved",
    plan: "gratis",
    is_featured: false,
    ticket_type: "gratis",
    price_at_door: null,
    price_advance: null,
    contact_whatsapp: null,
    contact_instagram: null,
    contact_web: null,
    contact_email: null,
    flyer_url: null,
    location: {
      id: "33333333-3333-3333-3333-333333333333",
      name: "El Tinglado Bar",
      address: "Av. Roca 1240",
      city_id: "22222222-2222-2222-2222-222222222222",
      latitude: null,
      longitude: null,
    },
    ...overrides,
  };
}

export const handlers = [
  http.get(`${API_URL}/api/events`, () => {
    return HttpResponse.json([makeEvent()]);
  }),
  http.post(`${API_URL}/api/events`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeEvent({ status: "pending", title: body.title as string }), { status: 201 });
  }),
  http.get(`${API_URL}/api/events/mine`, () => {
    return HttpResponse.json({ pending: [makeEvent({ status: "pending" })], approved: [], rejected: [] });
  }),
];
