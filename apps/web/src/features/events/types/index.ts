export type EventStatus = "pending" | "approved" | "rejected";
export type EventPlan = "gratis" | "dest" | "pro";
export type TicketType = "gratis" | "pago" | "anticipo";

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
  location_id: string;
  title: string;
  description: string | null;
  date: string;
  time: string;
  category: string;
  status: EventStatus;
  plan: EventPlan;
  is_featured: boolean;
  ticket_type: TicketType;
  price_at_door: number | null;
  price_advance: number | null;
  contact_whatsapp: string | null;
  contact_instagram: string | null;
  contact_web: string | null;
  contact_email: string | null;
  flyer_url: string | null;
  location: EventLocation;
}

export interface EventFiltersState {
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface EventCreateInput {
  user_id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  category: string;
  location_name: string;
  location_address: string;
  ticket_type: TicketType;
  price_at_door?: number;
  price_advance?: number;
  contact_whatsapp?: string;
  contact_instagram?: string;
  contact_web?: string;
  contact_email?: string;
}

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
