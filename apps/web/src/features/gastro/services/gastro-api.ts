import { apiDelete, apiGet, apiPatch, apiPost, apiPostFile, apiPut } from "@/lib/api-client";
import type {
  AdminGastroPlace,
  AdminGastroPlaceFilters,
  GastroPlace,
  GastroPlaceCreateInput,
  GastroPlaceFilters,
  GastroPlaceUpdateInput,
  GastroPlan,
} from "@/features/gastro/types";

// ── Público ──────────────────────────────────────────────────────────────

export async function fetchGastroPlaces(filters: GastroPlaceFilters): Promise<GastroPlace[]> {
  return apiGet<GastroPlace[]>("/api/gastro", {
    city_id: filters.city_id,
    gastro_type: filters.gastro_type,
    search: filters.search,
    has_delivery: filters.has_delivery !== undefined ? String(filters.has_delivery) : undefined,
    has_reservations:
      filters.has_reservations !== undefined ? String(filters.has_reservations) : undefined,
    price_range: filters.price_range,
  });
}

export async function fetchGastroPlace(id: string): Promise<GastroPlace> {
  return apiGet<GastroPlace>(`/api/gastro/${id}`);
}

// ── Admin ────────────────────────────────────────────────────────────────

export async function fetchAdminGastroPlaces(filters: AdminGastroPlaceFilters): Promise<AdminGastroPlace[]> {
  return apiGet<AdminGastroPlace[]>("/api/admin/gastro", {
    city_id: filters.city_id,
    gastro_type: filters.gastro_type,
    is_active: filters.is_active !== undefined ? String(filters.is_active) : undefined,
    is_public: filters.is_public !== undefined ? String(filters.is_public) : undefined,
    is_verified: filters.is_verified !== undefined ? String(filters.is_verified) : undefined,
    plan: filters.plan,
    search: filters.search,
  });
}

export async function createGastroPlace(input: GastroPlaceCreateInput): Promise<AdminGastroPlace> {
  return apiPost<AdminGastroPlace>("/api/admin/gastro", input);
}

export async function updateGastroPlace(
  id: string,
  input: GastroPlaceUpdateInput,
): Promise<AdminGastroPlace> {
  return apiPut<AdminGastroPlace>(`/api/admin/gastro/${id}`, input);
}

export async function deleteGastroPlace(id: string): Promise<void> {
  return apiDelete<void>(`/api/admin/gastro/${id}`);
}

export async function verifyGastroPlace(id: string, isVerified: boolean): Promise<AdminGastroPlace> {
  return apiPatch<AdminGastroPlace>(`/api/admin/gastro/${id}/verify`, { is_verified: isVerified });
}

export async function setGastroPlan(id: string, plan: GastroPlan): Promise<AdminGastroPlace> {
  return apiPatch<AdminGastroPlace>(`/api/admin/gastro/${id}/plan`, { plan });
}

export interface GastroCoverResponse {
  cover_img_url: string | null;
}

export async function uploadGastroCover(id: string, file: File): Promise<GastroCoverResponse> {
  return apiPostFile<GastroCoverResponse>(`/api/admin/gastro/${id}/cover`, file);
}

export async function deleteGastroCover(id: string): Promise<GastroCoverResponse> {
  return apiDelete<GastroCoverResponse>(`/api/admin/gastro/${id}/cover`);
}
