import { http, HttpResponse } from "msw";

import type { AdminEvent, Event, EventDetail, EventStats } from "@/features/events/types";
import type { User } from "@/features/auth/types";
import type { Plan } from "@/features/plans/types";
import type { AdminReport } from "@/features/reports/types";
import type { AdminSubscription, Subscription } from "@/features/subscriptions/types";

const API_URL = "http://localhost:8000";

export function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    city_id: "22222222-2222-2222-2222-222222222222",
    organizer_id: "44444444-4444-4444-4444-444444444444",
    location_id: "33333333-3333-3333-3333-333333333333",
    title: "Noche de Rock Nacional",
    description: "Un evento de prueba",
    date: "2099-01-01",
    time: "21:00:00",
    time_end: "23:30:00",
    categories: ["musica"],
    status: "approved",
    plan: "gratis",
    is_featured: false,
    featured_until: null,
    ticket_type: "gratis",
    price_at_door: null,
    price_advance: null,
    available_on_site: false,
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

export function makeEventDetail(overrides: Partial<EventDetail> = {}): EventDetail {
  return {
    ...makeEvent(),
    organizer_id: "44444444-4444-4444-4444-444444444444",
    city_name: "General Roca",
    organizer: {
      public_name: "El Tinglado Bar",
      public_whatsapp: "+5492984567890",
      city: "General Roca",
    },
    organizer_subscription: null,
    ...overrides,
  };
}

export function makeStats(overrides: Partial<EventStats> = {}): EventStats {
  return {
    total_events: 8,
    total_organizers: 2,
    total_cities: 1,
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
    created_at: "2024-03-01T00:00:00Z",
    created_by: null,
    ...overrides,
  };
}

export function makeAdminEvent(overrides: Partial<AdminEvent> = {}): AdminEvent {
  return {
    ...makeEvent(),
    organizer_public_name: "El Tinglado Bar",
    is_active: true,
    organizer_subscription: null,
    ...overrides,
  };
}

export function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: "66666666-6666-6666-6666-666666666666",
    name: "Destacado",
    plan_type: "dest",
    pricing_type: "fixed",
    description: "Ilimitado · fondo destacado · 2° prioridad",
    is_active: true,
    price: { id: "77777777-7777-7777-7777-777777777777", amount: 3500, currency: "ARS", promo_label: null },
    ...overrides,
  };
}

export function makeSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "88888888-8888-8888-8888-888888888888",
    plan_id: "66666666-6666-6666-6666-666666666666",
    plan_name: "Destacado",
    plan_type: "dest",
    status: "active",
    payment_method: "mercadopago",
    starts_at: "2099-01-01T00:00:00Z",
    expires_at: "2099-01-31T00:00:00Z",
    amount_paid: 3500,
    currency: "ARS",
    promo_label: null,
    mp_payment_id: "123456789",
    transfer_note: null,
    reviewed_at: null,
    created_at: "2099-01-01T00:00:00Z",
    event_id: "11111111-1111-1111-1111-111111111111",
    event_title: "Noche de Rock Nacional",
    ...overrides,
  };
}

export function makeAdminSubscription(overrides: Partial<AdminSubscription> = {}): AdminSubscription {
  return {
    ...makeSubscription(),
    user_id: "44444444-4444-4444-4444-444444444444",
    user_email: "organizador@sesale.com.ar",
    user_public_name: "El Tinglado Bar",
    ...overrides,
  };
}

export function makeAdminReport(overrides: Partial<AdminReport> = {}): AdminReport {
  return {
    id: "99999999-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    event_id: "11111111-1111-1111-1111-111111111111",
    event_title: "Noche de Rock Nacional",
    text: "Este evento tiene información incorrecta",
    contact_phone: "2984123456",
    created_at: "2099-01-01T21:00:00Z",
    status: "pending",
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
  http.get(`${API_URL}/api/events/:id`, () => {
    return HttpResponse.json(makeEventDetail());
  }),
  http.put(`${API_URL}/api/events/:id`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeEvent({ ...body, status: "pending" } as Partial<Event>));
  }),
  http.patch(`${API_URL}/api/events/:id/featured`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeEvent(body as Partial<Event>));
  }),
  http.patch(`${API_URL}/api/events/:id/plan`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeEvent(body as Partial<Event>));
  }),
  http.patch(`${API_URL}/api/events/:id/status`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeEvent(body as Partial<Event>));
  }),
  http.delete(`${API_URL}/api/events/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${API_URL}/api/admin/events`, () => {
    return HttpResponse.json([makeAdminEvent()]);
  }),
  http.get(`${API_URL}/api/users`, () => {
    return HttpResponse.json([makeUser()]);
  }),
  http.post(`${API_URL}/api/admin/users`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      makeUser({ email: body.email as string, public_name: body.public_name as string, created_by: "55555555-5555-5555-5555-555555555555" }),
      { status: 201 },
    );
  }),
  http.put(`${API_URL}/api/users/me`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeUser(body as Partial<User>));
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
  http.get(`${API_URL}/api/stats`, () => {
    return HttpResponse.json(makeStats());
  }),
  http.get(`${API_URL}/api/cities`, () => {
    return HttpResponse.json([
      { id: "22222222-2222-2222-2222-222222222222", name: "General Roca", province: "Río Negro", emoji: "🏙️", is_active: true, sort_order: 0 },
    ]);
  }),
  http.get(`${API_URL}/api/plans`, () => {
    return HttpResponse.json([
      makePlan({ id: "gratis-plan", name: "Gratuito", plan_type: "gratis", price: { id: "p0", amount: 0, currency: "ARS", promo_label: null } }),
      makePlan(),
      makePlan({ id: "pro-plan", name: "Destacado Plus", plan_type: "pro", price: { id: "p2", amount: 6500, currency: "ARS", promo_label: null } }),
      makePlan({ id: "banner-plan", name: "Banner web", plan_type: "banner", pricing_type: "custom", price: null }),
    ]);
  }),
  http.post(`${API_URL}/api/subscriptions/checkout`, () => {
    return HttpResponse.json({ init_point: "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-123" });
  }),
  http.get(`${API_URL}/api/subscriptions/me`, () => {
    return HttpResponse.json([]);
  }),
  http.get(`${API_URL}/api/admin/subscriptions`, () => {
    return HttpResponse.json([makeAdminSubscription()]);
  }),
  http.patch(`${API_URL}/api/admin/subscriptions/:id/activate`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeAdminSubscription({ status: "active", expires_at: body.expires_at as string }));
  }),
  http.post(`${API_URL}/api/subscriptions/transfer`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      makeSubscription({
        status: "pending_approval",
        payment_method: "transfer",
        transfer_note: (body.note as string | null) ?? null,
      }),
      { status: 201 },
    );
  }),
  http.patch(`${API_URL}/api/admin/subscriptions/:id/review`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const action = body.action as "approve" | "reject";
    return HttpResponse.json(
      makeAdminSubscription({
        status: action === "approve" ? "active" : "cancelled",
        payment_method: "transfer",
      }),
    );
  }),
  http.post(`${API_URL}/api/events/:id/report`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      {
        id: "99999999-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        event_id: "11111111-1111-1111-1111-111111111111",
        text: body.text as string,
        contact_phone: body.contact_phone as string,
        created_at: "2099-01-01T00:00:00Z",
        status: "pending",
      },
      { status: 201 },
    );
  }),
  http.get(`${API_URL}/api/admin/reports`, () => {
    return HttpResponse.json([makeAdminReport()]);
  }),
  http.patch(`${API_URL}/api/admin/reports/:id/status`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeAdminReport({ status: body.status as AdminReport["status"] }));
  }),
];
