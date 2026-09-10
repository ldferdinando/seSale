import { apiGet } from "@/lib/api-client";
import type { Category } from "@/features/events/types";

export async function fetchCategories(): Promise<Category[]> {
  return apiGet<Category[]>("/api/categories");
}

/** Etapa 13a — conteo de eventos aprobados, activos y futuros por categoría
 * activa en una ciudad. Response: `{ "<key>": <count>, ... }`. */
export async function fetchCategoryCounts(cityId: string): Promise<Record<string, number>> {
  return apiGet<Record<string, number>>("/api/categories/counts", { city_id: cityId });
}
