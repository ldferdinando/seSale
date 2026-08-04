export type EventStatus = "pending" | "approved" | "rejected";
export type EventPlan = "gratis" | "dest" | "pro";
export type TicketType = "gratis" | "pago" | "anticipo";
export type EventTimeOfDay = "diurno" | "nocturno";

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
  moment: EventTimeOfDay | null;
  category: string;
  status: EventStatus;
  plan: EventPlan;
  is_featured: boolean;
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

export type EventMoment = "dia" | "noche";

export interface EventFiltersState {
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  /** Filtro cliente (día 07:00–19:59 / noche 20:00–06:59): la API no lo soporta todavía. */
  moment?: EventMoment;
}

export interface EventCreateInput {
  title: string;
  description?: string;
  date: string;
  time: string;
  time_end?: string;
  moment?: EventTimeOfDay;
  category: string;
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
}

export type EventUpdateInput = Partial<EventCreateInput>;

export interface EventsByStatus {
  pending: Event[];
  approved: Event[];
  rejected: Event[];
}

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
