import type { City } from "@/features/auth/types";

/** Etapa 8a — GET /api/admin/cities: todas las ciudades (activas e
 * inactivas), con la cantidad de eventos activos como contexto antes de
 * deshabilitar. */
export interface AdminCity extends City {
  active_events_count: number;
}
