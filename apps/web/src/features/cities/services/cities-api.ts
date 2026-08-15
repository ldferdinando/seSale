import { apiGet, apiPatch } from "@/lib/api-client";
import type { AdminCity } from "@/features/cities/types";

export async function fetchAdminCities(): Promise<AdminCity[]> {
  return apiGet<AdminCity[]>("/api/admin/cities");
}

export async function toggleCity(cityId: string): Promise<AdminCity> {
  return apiPatch<AdminCity>(`/api/cities/${cityId}/toggle`, {});
}

export async function updateCitySortOrder(cityId: string, sortOrder: number): Promise<AdminCity> {
  return apiPatch<AdminCity>(`/api/admin/cities/${cityId}/sort-order`, { sort_order: sortOrder });
}
