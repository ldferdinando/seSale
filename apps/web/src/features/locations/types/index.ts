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

export interface AdminLocation extends Location {
  event_count: number;
}

export interface LocationFilters {
  city_id: string;
  search?: string;
  place_type?: string;
}

export interface AdminLocationFilters {
  city_id?: string;
  is_public?: boolean;
  is_verified?: boolean;
  place_type?: string;
  search?: string;
}

export interface LocationAdminCreateInput {
  name: string;
  address: string;
  city_id: string;
  description?: string;
  hours?: string;
  place_type?: string;
  latitude?: number;
  longitude?: number;
  is_verified?: boolean;
}

export type LocationAdminUpdateInput = Partial<LocationAdminCreateInput> & { is_public?: boolean };

/** Tipos de lugar sugeridos en el frontend — texto libre en el backend, sin enum. */
export const PLACE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "bar", label: "Bar" },
  { value: "teatro", label: "Teatro" },
  { value: "plaza", label: "Plaza" },
  { value: "club", label: "Club" },
  { value: "restaurant", label: "Restaurant" },
  { value: "cultural", label: "Espacio cultural" },
  { value: "deportivo", label: "Deportivo" },
  { value: "otro", label: "Otro" },
];
