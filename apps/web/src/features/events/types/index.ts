export type EventStatus = "pending" | "approved" | "rejected";
export type EventPlan = "gratis" | "dest" | "pro";
export type TicketType = "gratis" | "pago" | "anticipo";

export const MIN_EVENT_CATEGORIES = 1;
export const MAX_EVENT_CATEGORIES = 3;

export interface EventStats {
  total_events: number;
  total_organizers: number;
  total_cities: number;
}

export interface EventLocation {
  id: string;
  name: string;
  address: string;
  city_id: string;
  latitude: number | null;
  longitude: number | null;
  // Etapa 7b
  description: string | null;
  hours: string | null;
  place_type: string | null;
  is_verified: boolean;
  is_public: boolean;
}

/** Datos de ubicación con dirección libre — Tab "Indicar en el mapa" del
 * formulario de evento. Crea un Location nuevo con is_public=False. */
export interface LocationDataInput {
  name?: string;
  address: string;
  city_id: string;
  latitude?: number;
  longitude?: number;
}

export interface Event {
  id: string;
  city_id: string;
  organizer_id: string;
  location_id: string;
  title: string;
  description: string | null;
  date: string;
  time: string;
  time_end: string; // Etapa 10a — obligatorio, ya no nullable
  date_end: string; // Etapa 10b — obligatorio, el backend lo completa con `date` si no viene
  categories: string[];
  status: EventStatus;
  plan: EventPlan;
  is_featured: boolean;
  featured_until: string | null;
  ticket_type: TicketType;
  price_at_door: number | null;
  price_advance: number | null;
  available_on_site: boolean;
  contact_whatsapp: string | null;
  contact_instagram: string | null;
  contact_facebook: string | null; // Etapa 12a
  contact_web: string | null;
  contact_email: string | null;
  flyer_url: string | null;
  location: EventLocation;
  // Etapa 10b-2: expuesto también al organizador dueño (antes solo en
  // AdminEventRead) — autoservicio "Dar de baja"/"Volver a publicar".
  is_active: boolean;
}

export interface EventOrganizerPublic {
  public_name: string;
  public_whatsapp: string | null;
  city: string | null;
  // Etapa 9a — banner "Organizador verificado" con datos reales. Ver
  // OrganizerPublicRead (apps/api/app/schemas/event.py) por qué no se
  // exponen doc_type/doc_number/phone/full_name/email acá.
  is_verified: boolean;
  phone_verified: boolean;
  email_verified: boolean;
  member_since: string; // fecha ISO (YYYY-MM-DD), se formatea al mostrar
}

/**
 * Estado de pago más reciente del organizador — Etapa 6b-1. Solo viene
 * completo (no null) cuando quien pide el evento es el propio organizador o
 * un admin; nunca en la vista pública.
 */
export interface OrganizerSubscriptionStatus {
  status: "active" | "expired" | "cancelled" | "pending_payment" | "pending_approval";
  payment_method: "mercadopago" | "transfer" | "manual";
  plan_name: string;
  plan_type: EventPlan | "banner";
  transfer_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface EventDetail extends Event {
  organizer_id: string;
  city_name: string;
  organizer: EventOrganizerPublic;
  organizer_subscription: OrganizerSubscriptionStatus | null;
}

/** "diurno" 07:00–19:59 hs · "nocturno" 20:00–06:59 hs — filtro resuelto en el backend. */
export type EventMoment = "diurno" | "nocturno";

export interface EventFiltersState {
  cityId?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  moment?: EventMoment;
}

export interface EventCreateInput {
  title: string;
  description?: string;
  date: string;
  time: string;
  time_end: string; // Etapa 10a — obligatorio, ya no opcional
  date_end: string; // Etapa 10b — obligatorio
  categories: string[];
  /** Ciudad del evento — Etapa 7a. Sin ella, el backend usa la ciudad del organizador. */
  city_id?: string;
  // Etapa 7b — uno de los dos, nunca ambos vacíos: location_id (lugar
  // precargado, Tab A) o location_data (dirección libre + mapa, Tab B).
  location_id?: string;
  location_data?: LocationDataInput;
  ticket_type: TicketType;
  price_at_door?: number;
  price_advance?: number;
  available_on_site?: boolean;
  contact_whatsapp?: string;
  contact_instagram?: string;
  contact_facebook?: string; // Etapa 12a
  contact_web?: string;
  contact_email?: string;
  /** Solo tiene efecto si quien publica es admin: crea el evento en nombre de este organizador. */
  organizer_id?: string;
  /**
   * Etapa 9b: elegido en el resumen (EventPlanChooser), no en el
   * formulario. El backend siempre fuerza "gratis" si no hay pago
   * confirmado — ver create_event/a_revisar.md.
   */
  plan?: EventPlan;
}

// Etapa 10b-2: is_active no forma parte de EventCreateInput (solo tiene
// sentido en un evento ya existente) — se agrega acá.
export type EventUpdateInput = Partial<EventCreateInput> & { is_active?: boolean };

export interface EventFeaturedUpdateInput {
  is_featured: boolean;
  featured_until?: string | null;
}

export interface EventsByStatus {
  pending: Event[];
  approved: Event[];
  rejected: Event[];
}

export interface AdminEvent extends Event {
  organizer_public_name: string;
  // is_active ya viene de Event desde la Etapa 10b-2 (antes era exclusivo de acá).
  organizer_subscription: OrganizerSubscriptionStatus | null;
}

export interface AdminEventFilters {
  status?: EventStatus;
  city_id?: string;
  category?: string;
  plan?: EventPlan;
  search?: string;
  date_from?: string;
  date_to?: string;
  organizer_id?: string;
}

export const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "approved", label: "Aprobado" },
  { value: "rejected", label: "Rechazado" },
];

export const PLAN_OPTIONS: { value: EventPlan; label: string }[] = [
  { value: "gratis", label: "Gratis" },
  { value: "dest", label: "Destacado" },
  { value: "pro", label: "Destacado Plus" },
];

export const TICKET_TYPE_OPTIONS: { value: TicketType; label: string }[] = [
  { value: "gratis", label: "Gratis" },
  { value: "pago", label: "Pago en puerta" },
  { value: "anticipo", label: "Con anticipo" },
];

/** Categoría del catálogo dinámico (GET /api/categories) — Etapa 12a. */
export interface Category {
  id: string;
  key: string;
  name: string;
  emoji: string | null;
  color: string | null;
  sort_order: number;
}

export interface CategoryAdmin extends Category {
  is_active: boolean;
  created_at: string;
}

export interface CategoryCreateInput {
  key: string;
  name: string;
  emoji?: string;
  color?: string;
  sort_order?: number;
}

export type CategoryUpdateInput = Omit<CategoryCreateInput, "key">;

/** Fallback hardcodeado — usado si GET /api/categories falla (degradación
 * elegante, ver useCategoryCatalog) y en los pocos lugares que todavía no
 * migraron a la lista dinámica. */
export const EVENT_CATEGORIES: { value: string; label: string }[] = [
  { value: "musica", label: "Música en vivo" },
  { value: "fiesta", label: "Fiesta / Baile" },
  { value: "teatro", label: "Teatro" },
  { value: "feria", label: "Feria" },
  { value: "dj", label: "DJ / Electrónica" },
  { value: "milonga", label: "Milonga / Tango" },
  { value: "pena", label: "Peña folclórica" },
  { value: "standup", label: "Stand up" },
  { value: "arte", label: "Exposición / Arte" },
  { value: "recital", label: "Recital" },
  { value: "cine", label: "Cine" },
  { value: "infantil", label: "Infantil" },
  { value: "deportes", label: "Deportes" },
];
