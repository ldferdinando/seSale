export type AdSection = "eventos" | "eventos-grid" | "gastronomia";
export type AdRotationMode = "sequential" | "random";
export type AdItemStatus = "active" | "paused" | "expired";

export interface AdItemPublic {
  id: string;
  img_url: string;
  link_url: string | null;
  alt_text: string | null;
  display_order: number;
}

export interface AdSlot {
  id: string;
  city_id: string;
  section: AdSection;
  slot_position: number;
  rotation_mode: AdRotationMode;
  rotation_interval_seconds: number;
  is_active: boolean;
  items: AdItemPublic[];
}

export interface AdItemAdmin extends AdItemPublic {
  advertiser_name: string | null;
  user_id: string;
  user_public_name: string;
  starts_at: string;
  ends_at: string | null;
  status: AdItemStatus;
  created_by: string;
  created_at: string;
}

export interface AdSlotAdmin extends Omit<AdSlot, "items"> {
  items: AdItemAdmin[];
}

/** Lo que devuelve GET /api/users/me/banners: AdItemAdmin + dónde aparece. */
export interface MyAdItem extends AdItemAdmin {
  section: AdSection;
  slot_position: number;
}

export interface AdItemCreateInput {
  slot_id: string;
  user_id: string;
  img_url: string;
  link_url?: string;
  alt_text?: string;
  advertiser_name?: string;
  starts_at?: string;
  ends_at?: string;
  display_order?: number;
}

export type AdItemUpdateInput = Partial<Omit<AdItemCreateInput, "slot_id" | "user_id">> & {
  status?: AdItemStatus;
};

export interface AdminAdItemFilters {
  city_id?: string;
  section?: AdSection;
  status?: AdItemStatus;
  user_id?: string;
  date_from?: string;
  date_to?: string;
}

export const AD_SECTION_LABELS: Record<AdSection, string> = {
  eventos: "Eventos",
  "eventos-grid": "Eventos (grilla)",
  gastronomia: "Gastronomía",
};
