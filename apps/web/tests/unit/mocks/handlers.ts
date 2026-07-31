import { http, HttpResponse } from "msw";

import type { Event } from "@/features/events/types";
import type { User } from "@/features/auth/types";

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

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "44444444-4444-4444-4444-444444444444",
    email: "organizador@sesale.com.ar",
    role: "user",
    is_active: true,
    full_name: "Juan Pérez",
    doc_type: null,
    doc_number: null,
    phone: null,
    phone_verified: false,
    email_verified: false,
    public_name: "El Tinglado Bar",
    public_whatsapp: null,
    city_id: "22222222-2222-2222-2222-222222222222",
    is_verified: false,
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

  // Sin sesión por defecto: los tests que necesiten un usuario logueado
  // sobreescriben este handler con server.use(...).
  http.get(`${API_URL}/api/users/me`, () => {
    return new HttpResponse(null, { status: 401 });
  }),
  http.post(`${API_URL}/api/auth/login`, () => {
    return HttpResponse.json({ access_token: "fake-access-token", token_type: "bearer", expires_in: 1800 });
  }),
  http.post(`${API_URL}/api/auth/register`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeUser({ email: body.email as string, public_name: body.public_name as string }), {
      status: 201,
    });
  }),
  http.post(`${API_URL}/api/auth/refresh`, () => {
    return new HttpResponse(null, { status: 401 });
  }),
  http.post(`${API_URL}/api/auth/logout`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${API_URL}/api/cities`, () => {
    return HttpResponse.json([
      { id: "22222222-2222-2222-2222-222222222222", name: "General Roca", province: "Río Negro", emoji: "🏙️", is_active: true, sort_order: 0 },
    ]);
  }),
];
