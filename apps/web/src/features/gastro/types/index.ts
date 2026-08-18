export type GastroPlan = "gratis" | "dest" | "pro";
export type PriceRange = "$" | "$$" | "$$$";

export interface DayHours {
  open: string;
  close: string;
}

export type OpeningHours = Record<string, DayHours | null>;

export const WEEKDAYS = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
};

export interface GastroPlace {
  id: string;
  name: string;
  address: string;
  city_id: string;
  city_name: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  hours: string | null;
  opening_hours: OpeningHours | null;
  gastro_types: string[];
  gastro_whatsapp: string | null;
  gastro_instagram: string | null;
  gastro_web: string | null;
  gastro_email: string | null;
  has_delivery: boolean;
  has_reservations: boolean;
  price_range: PriceRange | null;
  cover_img_url: string | null;
  plan: GastroPlan;
  is_verified: boolean;
  event_count: number;
}

export interface AdminGastroPlace extends GastroPlace {
  is_active: boolean;
  is_gastro: boolean;
  is_public: boolean;
  featured_until: string | null;
  place_type: string | null;
  created_at: string;
}

export interface GastroPlaceFilters {
  city_id: string;
  gastro_type?: string;
  search?: string;
  has_delivery?: boolean;
  has_reservations?: boolean;
  price_range?: string;
}

export interface AdminGastroPlaceFilters {
  city_id?: string;
  gastro_type?: string;
  is_active?: boolean;
  is_public?: boolean;
  is_verified?: boolean;
  plan?: GastroPlan;
  search?: string;
}

export interface GastroPlaceCreateInput {
  name: string;
  address: string;
  city_id: string;
  gastro_types: string[];
  description?: string;
  hours?: string;
  opening_hours?: OpeningHours | null;
  gastro_whatsapp?: string;
  gastro_instagram?: string;
  gastro_web?: string;
  gastro_email?: string;
  has_delivery?: boolean;
  has_reservations?: boolean;
  price_range?: PriceRange | null;
  latitude?: number;
  longitude?: number;
  is_verified?: boolean;
}

export type GastroPlaceUpdateInput = Partial<GastroPlaceCreateInput> & { is_active?: boolean };

/** Mapeados 1:1 a GASTRO_TYPES (app/models/location_gastro_type.py) — ver
 * a_revisar.md, Etapa 8e: los chips de seSALE.html tienen solo 6 tipos, este
 * pedido pide los 10 completos. */
export const GASTRO_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "cerveceria", label: "Cervecerías" },
  { value: "restaurante", label: "Restaurantes" },
  { value: "parrilla", label: "Parrillas" },
  { value: "bar", label: "Bares" },
  { value: "cafe", label: "Cafés" },
  { value: "pizzeria", label: "Pizzerías" },
  { value: "heladeria", label: "Heladerías" },
  { value: "rotiseria", label: "Rotiserías" },
  { value: "vinoteca", label: "Vinotecas" },
  { value: "otro", label: "Otros" },
];

export const GASTRO_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  GASTRO_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);
