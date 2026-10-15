import { apiDelete, apiGet, apiPatch, apiPost, apiPostFile, apiPut } from "@/lib/api-client";
import type {
  GastroPlace,
  GastroPlaceFilters,
  GastroPlan,
  GastroType,
  GastroTypeAdmin,
  GastroTypeCreateInput,
  GastroTypeUpdateInput,
} from "@/features/gastro/types";
import type { AdminLocation } from "@/features/locations/types";

// ── Público ──────────────────────────────────────────────────────────────

export async function fetchGastroTypes(): Promise<GastroType[]> {
  return apiGet<GastroType[]>("/api/gastro-types");
}

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

// El listado/alta/edición/borrado/verificación de lugares (con o sin tipos)
// vive en features/locations/services (panel unificado de Lugares). Acá
// quedan solo el plan y la portada, específicos de Gastronomía/Espacios.

export interface SetGastroPlanInput {
  plan: GastroPlan;
  /** ISO "YYYY-MM-DD". Si no vienen y `plan` es "dest"/"pro", el backend
   * completa hoy / hoy+30 días (mismo default que antes de poder elegirlas). */
  featured_from?: string | null;
  featured_until?: string | null;
}

export async function setGastroPlan(id: string, input: SetGastroPlanInput): Promise<AdminLocation> {
  return apiPatch<AdminLocation>(`/api/admin/gastro/${id}/plan`, input);
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

export interface GastroFeaturedBannerResponse {
  featured_banner_url: string | null;
}

export async function uploadGastroFeaturedBanner(id: string, file: File): Promise<GastroFeaturedBannerResponse> {
  return apiPostFile<GastroFeaturedBannerResponse>(`/api/admin/gastro/${id}/featured-banner`, file);
}

export async function deleteGastroFeaturedBanner(id: string): Promise<GastroFeaturedBannerResponse> {
  return apiDelete<GastroFeaturedBannerResponse>(`/api/admin/gastro/${id}/featured-banner`);
}

// ── Etapa 12a — ABM de tipos gastronómicos (admin) ──────────────────────────

export async function fetchAdminGastroTypes(isActive?: boolean): Promise<GastroTypeAdmin[]> {
  return apiGet<GastroTypeAdmin[]>("/api/admin/gastro-types", {
    is_active: isActive !== undefined ? String(isActive) : undefined,
  });
}

export async function createGastroType(input: GastroTypeCreateInput): Promise<GastroTypeAdmin> {
  return apiPost<GastroTypeAdmin>("/api/admin/gastro-types", input);
}

export async function updateGastroType(id: string, input: GastroTypeUpdateInput): Promise<GastroTypeAdmin> {
  return apiPut<GastroTypeAdmin>(`/api/admin/gastro-types/${id}`, input);
}

export async function toggleGastroType(id: string): Promise<GastroTypeAdmin> {
  return apiPatch<GastroTypeAdmin>(`/api/admin/gastro-types/${id}/toggle`, {});
}
