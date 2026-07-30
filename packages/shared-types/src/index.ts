export type EventStatus = "pending" | "approved" | "rejected";

export type EventPlan = "gratis" | "dest" | "pro";

export type TicketType = "gratis" | "pago" | "anticipo";

export type SubscriptionStatus = "active" | "expired" | "cancelled";

export type EventCategory =
  | "musica"
  | "fiesta"
  | "teatro"
  | "feria"
  | "dj"
  | "milonga"
  | "pena"
  | "standup"
  | "arte"
  | "recital"
  | "cine"
  | "infantil"
  | "deportes";

export interface City {
  id: string;
  name: string;
  province: string;
  emoji: string;
  is_active: boolean;
  sort_order: number;
}

export interface Location {
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
  category: EventCategory;
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
  created_at: string;
  location: Location;
}
