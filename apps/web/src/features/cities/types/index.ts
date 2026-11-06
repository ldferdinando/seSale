import type { City } from "@/features/auth/types";

/** Etapa 8a — GET /api/admin/cities: todas las ciudades (activas e
 * inactivas), con la cantidad de eventos activos como contexto antes de
 * deshabilitar. */
export interface AdminCity extends City {
  active_events_count: number;
}

/** POST /api/admin/cities. `sort_order` es opcional: si no se manda, el
 * backend le asigna el máximo actual + 1. */
export interface CityCreateInput {
  name: string;
  province: string;
  emoji?: string;
  latitude?: number;
  longitude?: number;
  sort_order?: number;
}
