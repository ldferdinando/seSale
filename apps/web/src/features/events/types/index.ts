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
  time_end: string | null;
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
  contact_web: string | null;
  contact_email: string | null;
  flyer_url: string | null;
  location: EventLocation;
}

export interface EventOrganizerPublic {
  public_name: string;
  public_whatsapp: string | null;
  city: string | null;
}

export interface EventDetail extends Event {
  organizer_id: string;
  city_name: string;
  organizer: EventOrganizerPublic;
}

/** "diurno" 07:00–19:59 hs · "nocturno" 20:00–06:59 hs — filtro resuelto en el backend. */
export type EventMoment = "diurno" | "nocturno";

export interface EventFiltersState {
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
  time_end?: string;
  categories: string[];
  location_name: string;
  location_address: string;
  ticket_type: TicketType;
  price_at_door?: number;
  price_advance?: number;
  available_on_site?: boolean;
  contact_whatsapp?: string;
  contact_instagram?: string;
  contact_web?: string;
  contact_email?: string;
  /** Solo tiene efecto si quien publica es admin: crea el evento en nombre de este organizador. */
  organizer_id?: string;
}

export type EventUpdateInput = Partial<EventCreateInput>;

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
  is_active: boolean;
}

export interface AdminEventFilters {
  status?: EventStatus;
  city_id?: string;
  category?: string;
  plan?: EventPlan;
  search?: string;
  date_from?: string;
  date_to?: string;
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
