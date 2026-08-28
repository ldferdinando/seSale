import { http, HttpResponse } from "msw";

import type { AdItemAdmin, AdSlot, AdSlotAdmin, MyAdItem } from "@/features/ads/types";
import type { AdminEvent, Event, EventDetail, EventStats } from "@/features/events/types";
import type { User } from "@/features/auth/types";
import type { UserAdmin } from "@/features/users/types";
import type { AdminCity } from "@/features/cities/types";
import type { AdminGastroPlace, GastroPlace } from "@/features/gastro/types";
import type { AdminLocation, Location } from "@/features/locations/types";
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
    date_end: "2099-01-01",
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
    contact_facebook: null,
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
      description: null,
      hours: null,
      place_type: null,
      is_verified: false,
      is_public: false,
    },
    is_active: true,
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
      is_verified: true,
      phone_verified: true,
      email_verified: true,
      member_since: "2024-03-01",
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

export function makeAdminUser(overrides: Partial<UserAdmin> = {}): UserAdmin {
  return {
    ...makeUser(),
    city_name: "General Roca",
    event_count: 0,
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
    mercadopago_available: true,
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

export function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: "33333333-3333-3333-3333-333333333333",
    name: "El Tinglado Bar",
    address: "Av. Roca 1240",
    description: "Espacio cultural con shows en vivo",
    hours: "Jueves a sábados 21:00 a 03:00",
    place_type: "bar",
    city_id: "22222222-2222-2222-2222-222222222222",
    city_name: "General Roca",
    latitude: -39.032,
    longitude: -67.581,
    is_verified: true,
    is_public: true,
    ...overrides,
  };
}

export function makeAdminLocation(overrides: Partial<AdminLocation> = {}): AdminLocation {
  return {
    ...makeLocation(),
    event_count: 0,
    ...overrides,
  };
}

export function makeAdminCity(overrides: Partial<AdminCity> = {}): AdminCity {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    name: "General Roca",
    province: "Río Negro",
    emoji: "🏙️",
    is_active: true,
    sort_order: 0,
    latitude: -39.0333,
    longitude: -67.5833,
    active_events_count: 0,
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

export function makeAdSlot(overrides: Partial<AdSlot> = {}): AdSlot {
  return {
    id: "aaaaaaa1-aaaa-4aaa-aaaa-aaaaaaaaaaa1",
    city_id: "22222222-2222-2222-2222-222222222222",
    section: "eventos",
    slot_position: 0,
    rotation_mode: "sequential",
    rotation_interval_seconds: 3,
    is_active: true,
    items: [],
    ...overrides,
  };
}

export function makeAdItemAdmin(overrides: Partial<AdItemAdmin> = {}): AdItemAdmin {
  return {
    id: "bbbbbbb1-bbbb-4bbb-bbbb-bbbbbbbbbbb1",
    img_url: "https://example.com/banner.jpg",
    link_url: null,
    alt_text: null,
    display_order: 0,
    advertiser_name: "El Tinglado Bar",
    user_id: "44444444-4444-4444-4444-444444444444",
    user_public_name: "El Tinglado Bar",
    starts_at: "2099-01-01",
    ends_at: null,
    status: "active",
    created_by: "55555555-5555-5555-5555-555555555555",
    created_at: "2099-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeAdSlotAdmin(overrides: Partial<AdSlotAdmin> = {}): AdSlotAdmin {
  return { ...makeAdSlot(), ...overrides } as AdSlotAdmin;
}

export function makeMyAdItem(overrides: Partial<MyAdItem> = {}): MyAdItem {
  return { ...makeAdItemAdmin(), section: "eventos", slot_position: 0, ...overrides };
}

export function makeGastroPlace(overrides: Partial<GastroPlace> = {}): GastroPlace {
  return {
    id: "55555555-5555-5555-5555-555555555555",
    name: "El Tinglado Bar",
    address: "Av. Roca 1240",
    city_id: "22222222-2222-2222-2222-222222222222",
    city_name: "General Roca",
    latitude: -39.0333,
    longitude: -67.5833,
    description: "Un bar con música en vivo",
    hours: null,
    opening_hours: {
      lunes: null,
      martes: { open: "20:00", close: "02:00" },
      miercoles: { open: "20:00", close: "02:00" },
      jueves: { open: "20:00", close: "02:00" },
      viernes: { open: "20:00", close: "03:00" },
      sabado: { open: "20:00", close: "03:00" },
      domingo: null,
    },
    gastro_types: ["bar", "cerveceria"],
    gastro_whatsapp: "5492984000001",
    gastro_instagram: "eltingladobar",
    gastro_web: null,
    gastro_email: null,
    has_delivery: false,
    has_reservations: true,
    price_range: "$$",
    cover_img_url: null,
    plan: "dest",
    is_verified: true,
    event_count: 2,
    ...overrides,
  };
}

export function makeAdminGastroPlace(overrides: Partial<AdminGastroPlace> = {}): AdminGastroPlace {
  return {
    ...makeGastroPlace(),
    is_active: true,
    is_gastro: true,
    is_public: true,
    featured_until: null,
    place_type: null,
    created_at: "2099-01-01T00:00:00Z",
    ...overrides,
  };
}

export const handlers = [
  http.get(`${API_URL}/api/ads`, ({ request }) => {
    const url = new URL(request.url);
    const section = (url.searchParams.get("section") ?? "eventos") as AdSlot["section"];
    const positions = section === "eventos-grid" ? [0, 1] : [0, 1, 2];
    return HttpResponse.json(
      positions.map((slot_position) => makeAdSlot({ section, slot_position, id: `${section}-slot-${slot_position}` })),
    );
  }),
  http.get(`${API_URL}/api/admin/ad-slots`, () => {
    return HttpResponse.json([makeAdSlotAdmin()]);
  }),
  http.get(`${API_URL}/api/admin/ad-items`, () => {
    return HttpResponse.json([makeAdItemAdmin()]);
  }),
  http.post(`${API_URL}/api/admin/ad-items`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeAdItemAdmin({ ...body } as Partial<AdItemAdmin>), { status: 201 });
  }),
  http.put(`${API_URL}/api/admin/ad-items/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeAdItemAdmin({ id: params.id as string, ...body } as Partial<AdItemAdmin>));
  }),
  http.delete(`${API_URL}/api/admin/ad-items/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
  http.patch(`${API_URL}/api/admin/ad-items/:id/status`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeAdItemAdmin({ id: params.id as string, status: body.status as AdItemAdmin["status"] }));
  }),
  http.post(`${API_URL}/api/admin/ad-items/:id/image`, () => {
    return HttpResponse.json(makeAdItemAdmin({ img_url: "https://example.com/uploaded.jpg" }));
  }),
  http.patch(`${API_URL}/api/admin/ad-items/reorder`, () => {
    return HttpResponse.json([makeAdItemAdmin()]);
  }),
  http.get(`${API_URL}/api/users/me/banners`, () => {
    return HttpResponse.json([]);
  }),

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
  http.get(`${API_URL}/api/admin/users`, () => {
    return HttpResponse.json([makeAdminUser()]);
  }),
  http.patch(`${API_URL}/api/users/:id/role`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeUser({ role: body.role as "user" | "admin" }));
  }),
  http.patch(`${API_URL}/api/users/:id`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeUser({ is_active: body.is_active as boolean }));
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
  http.get(`${API_URL}/api/locations`, () => {
    return HttpResponse.json([makeLocation()]);
  }),
  http.get(`${API_URL}/api/locations/:id`, ({ params }) => {
    return HttpResponse.json(makeLocation({ id: params.id as string }));
  }),
  http.get(`${API_URL}/api/admin/locations`, () => {
    return HttpResponse.json([makeAdminLocation()]);
  }),
  http.post(`${API_URL}/api/admin/locations`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      makeAdminLocation({ name: body.name as string, address: body.address as string, is_public: true }),
      { status: 201 },
    );
  }),
  http.put(`${API_URL}/api/admin/locations/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeAdminLocation({ id: params.id as string, ...body }));
  }),
  http.patch(`${API_URL}/api/admin/locations/:id/verify`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeAdminLocation({ id: params.id as string, is_verified: body.is_verified as boolean }));
  }),
  http.delete(`${API_URL}/api/admin/locations/:id`, () => {
    return HttpResponse.json({ detail: "Lugar eliminado" });
  }),
  http.get(`${API_URL}/api/cities`, () => {
    return HttpResponse.json([
      {
        id: "22222222-2222-2222-2222-222222222222",
        name: "General Roca",
        province: "Río Negro",
        emoji: "🏙️",
        is_active: true,
        sort_order: 0,
        latitude: -39.0333,
        longitude: -67.5833,
      },
      {
        id: "cccccccc-cccc-4ccc-cccc-cccccccccccc",
        name: "Cipolletti",
        province: "Río Negro",
        emoji: "🌆",
        is_active: true,
        sort_order: 1,
        latitude: -38.9333,
        longitude: -68.0,
      },
    ]);
  }),
  http.get(`${API_URL}/api/admin/cities`, () => {
    return HttpResponse.json([makeAdminCity()]);
  }),
  http.patch(`${API_URL}/api/cities/:id/toggle`, ({ params }) => {
    return HttpResponse.json(makeAdminCity({ id: params.id as string, is_active: false }));
  }),
  http.patch(`${API_URL}/api/admin/cities/:id/sort-order`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeAdminCity({ id: params.id as string, sort_order: body.sort_order as number }));
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

  // ── Etapa 8e — Gastronomía ────────────────────────────────────────────
  http.get(`${API_URL}/api/gastro`, ({ request }) => {
    const url = new URL(request.url);
    const gastroType = url.searchParams.get("gastro_type");
    const places = [
      makeGastroPlace(),
      makeGastroPlace({ id: "66666666-6666-6666-6666-666666666666", name: "La Toscana", gastro_types: ["cafe"], plan: "gratis" }),
    ];
    const filtered = gastroType ? places.filter((p) => p.gastro_types.includes(gastroType)) : places;
    return HttpResponse.json(filtered);
  }),
  http.get(`${API_URL}/api/gastro/:id`, ({ params }) => {
    return HttpResponse.json(makeGastroPlace({ id: params.id as string }));
  }),
  http.get(`${API_URL}/api/admin/gastro`, () => {
    return HttpResponse.json([makeAdminGastroPlace()]);
  }),
  http.post(`${API_URL}/api/admin/gastro`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeAdminGastroPlace({ ...body } as Partial<AdminGastroPlace>), { status: 201 });
  }),
  http.put(`${API_URL}/api/admin/gastro/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeAdminGastroPlace({ id: params.id as string, ...body } as Partial<AdminGastroPlace>));
  }),
  http.delete(`${API_URL}/api/admin/gastro/:id`, () => {
    return HttpResponse.json({ detail: "Lugar gastronómico eliminado" });
  }),
  http.patch(`${API_URL}/api/admin/gastro/:id/verify`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeAdminGastroPlace({ id: params.id as string, is_verified: body.is_verified as boolean }));
  }),
  http.patch(`${API_URL}/api/admin/gastro/:id/plan`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeAdminGastroPlace({ id: params.id as string, plan: body.plan as AdminGastroPlace["plan"] }));
  }),
  http.post(`${API_URL}/api/admin/gastro/:id/cover`, () => {
    return HttpResponse.json({ cover_img_url: "https://storage.example.com/cover.jpg" });
  }),
  http.delete(`${API_URL}/api/admin/gastro/:id/cover`, () => {
    return HttpResponse.json({ cover_img_url: null });
  }),

  // ── Etapa 12a — categorías y tipos gastronómicos (catálogo dinámico) ────
  http.get(`${API_URL}/api/categories`, () => {
    return HttpResponse.json([
      { id: "cat-musica", key: "musica", name: "Música en vivo", emoji: "🎵", color: "#7F77DD", sort_order: 1 },
      { id: "cat-fiesta", key: "fiesta", name: "Fiesta / Baile", emoji: "🎉", color: "#E91E8C", sort_order: 2 },
      { id: "cat-teatro", key: "teatro", name: "Teatro", emoji: "🎭", color: "#EF9F27", sort_order: 3 },
      { id: "cat-feria", key: "feria", name: "Feria", emoji: "🛍️", color: "#1D9E75", sort_order: 4 },
      { id: "cat-dj", key: "dj", name: "DJ / Electrónica", emoji: "🎧", color: "#378ADD", sort_order: 5 },
      { id: "cat-milonga", key: "milonga", name: "Milonga / Tango", emoji: "💃", color: "#378ADD", sort_order: 6 },
      { id: "cat-pena", key: "pena", name: "Peña folclórica", emoji: "🪗", color: "#D85A30", sort_order: 7 },
      { id: "cat-standup", key: "standup", name: "Stand up", emoji: "🎤", color: "#888888", sort_order: 8 },
      { id: "cat-arte", key: "arte", name: "Exposición / Arte", emoji: "🎨", color: "#7F77DD", sort_order: 9 },
      { id: "cat-recital", key: "recital", name: "Recital", emoji: "🎸", color: "#7F77DD", sort_order: 10 },
      { id: "cat-cine", key: "cine", name: "Cine", emoji: "🎬", color: "#888888", sort_order: 11 },
      { id: "cat-infantil", key: "infantil", name: "Infantil", emoji: "🧸", color: "#FF8FA3", sort_order: 12 },
      { id: "cat-deportes", key: "deportes", name: "Deportes", emoji: "⚽", color: "#14B8A6", sort_order: 13 },
    ]);
  }),
  http.get(`${API_URL}/api/admin/categories`, () => {
    return HttpResponse.json([
      {
        id: "cat-musica",
        key: "musica",
        name: "Música en vivo",
        emoji: "🎵",
        color: "#7F77DD",
        sort_order: 1,
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);
  }),
  http.post(`${API_URL}/api/admin/categories`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      { id: "new-cat", is_active: true, created_at: "2026-01-01T00:00:00Z", sort_order: 99, emoji: null, color: null, ...body },
      { status: 201 },
    );
  }),
  http.put(`${API_URL}/api/admin/categories/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      id: params.id,
      key: "musica",
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
      emoji: null,
      color: null,
      sort_order: 99,
      ...body,
    });
  }),
  http.patch(`${API_URL}/api/admin/categories/:id/toggle`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      key: "musica",
      name: "Música en vivo",
      emoji: "🎵",
      color: "#7F77DD",
      sort_order: 1,
      is_active: false,
      created_at: "2026-01-01T00:00:00Z",
    });
  }),

  http.get(`${API_URL}/api/gastro-types`, () => {
    // Etapa 12a: mismos keys/labels que el fallback hardcodeado
    // (GASTRO_TYPE_OPTIONS, features/gastro/types/index.ts) — así el swap
    // fallback→datos reales no le mueve el piso a los tests que ya
    // asumían esas 10 opciones plurales.
    return HttpResponse.json([
      { id: "gt-cerveceria", key: "cerveceria", name: "Cervecerías", emoji: null, sort_order: 1 },
      { id: "gt-restaurante", key: "restaurante", name: "Restaurantes", emoji: null, sort_order: 2 },
      { id: "gt-parrilla", key: "parrilla", name: "Parrillas", emoji: null, sort_order: 3 },
      { id: "gt-bar", key: "bar", name: "Bares", emoji: null, sort_order: 4 },
      { id: "gt-cafe", key: "cafe", name: "Cafés", emoji: null, sort_order: 5 },
      { id: "gt-pizzeria", key: "pizzeria", name: "Pizzerías", emoji: null, sort_order: 6 },
      { id: "gt-heladeria", key: "heladeria", name: "Heladerías", emoji: null, sort_order: 7 },
      { id: "gt-rotiseria", key: "rotiseria", name: "Rotiserías", emoji: null, sort_order: 8 },
      { id: "gt-vinoteca", key: "vinoteca", name: "Vinotecas", emoji: null, sort_order: 9 },
      { id: "gt-otro", key: "otro", name: "Otros", emoji: null, sort_order: 10 },
    ]);
  }),
  http.get(`${API_URL}/api/admin/gastro-types`, () => {
    return HttpResponse.json([
      {
        id: "gt-bar",
        key: "bar",
        name: "Bar",
        emoji: "🍸",
        sort_order: 1,
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);
  }),
  http.post(`${API_URL}/api/admin/gastro-types`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      { id: "new-gt", is_active: true, created_at: "2026-01-01T00:00:00Z", sort_order: 99, emoji: null, ...body },
      { status: 201 },
    );
  }),
  http.put(`${API_URL}/api/admin/gastro-types/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      id: params.id,
      key: "bar",
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
      emoji: null,
      sort_order: 99,
      ...body,
    });
  }),
  http.patch(`${API_URL}/api/admin/gastro-types/:id/toggle`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      key: "bar",
      name: "Bar",
      emoji: "🍸",
      sort_order: 1,
      is_active: false,
      created_at: "2026-01-01T00:00:00Z",
    });
  }),
];
