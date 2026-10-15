import type { GastroPlan, GastroTypeGrupo, OpeningHours, PriceRange } from "@/features/gastro/types";

export interface Location {
  id: string;
  name: string;
  address: string;
  description: string | null;
  hours: string | null;
  place_type: string | null;
  city_id: string;
  city_name: string;
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean;
  is_public: boolean;
}

/** Lugar completo del panel admin unificado (Etapa "Unificar panel admin de
 * Lugares") — mismo Location para lugares de eventos, Gastronomía y
 * Espacios. Los campos de contacto conservan el prefijo `gastro_` del
 * backend pero aplican a cualquier lugar. `event_count` = total de eventos
 * asociados (bloquea el borrado). */
export interface AdminLocation extends Location {
  event_count: number;
  gastro_types: string[];
  opening_hours: OpeningHours | null;
  gastro_whatsapp: string | null;
  gastro_instagram: string | null;
  gastro_web: string | null;
  gastro_email: string | null;
  gastro_facebook: string | null;
  gastro_phone: string | null;
  has_delivery: boolean;
  has_reservations: boolean;
  price_range: PriceRange | null;
  cover_img_url: string | null;
  plan: GastroPlan;
  featured_banner_url: string | null;
  is_active: boolean;
  is_gastro: boolean;
  created_at: string;

  /** Valor crudo de Location.plan (no filtrado por vigencia, a diferencia
   * de `plan`) — lo que efectivamente editó el admin. */
  configured_plan: GastroPlan;
  featured_from: string | null;
  featured_until: string | null;
}

export interface LocationFilters {
  city_id: string;
  search?: string;
  place_type?: string;
}

/** `grupo`: "gastro"/"espacios" = tiene algún tipo de ese grupo; "none" = sin tipos. */
export type AdminLocationGrupoFilter = GastroTypeGrupo | "none";

export interface AdminLocationFilters {
  city_id?: string;
  is_active?: boolean;
  is_public?: boolean;
  is_verified?: boolean;
  grupo?: AdminLocationGrupoFilter;
  search?: string;
}

export interface LocationAdminCreateInput {
  name: string;
  address: string;
  city_id: string;
  gastro_types?: string[];
  description?: string;
  hours?: string;
  opening_hours?: OpeningHours | null;
  gastro_whatsapp?: string | null;
  gastro_instagram?: string | null;
  gastro_web?: string | null;
  gastro_email?: string | null;
  gastro_facebook?: string | null;
  gastro_phone?: string | null;
  has_delivery?: boolean;
  has_reservations?: boolean;
  price_range?: PriceRange | null;
  latitude?: number;
  longitude?: number;
  is_verified?: boolean;
}

export type LocationAdminUpdateInput = Partial<LocationAdminCreateInput> & {
  is_public?: boolean;
  is_active?: boolean;
};
