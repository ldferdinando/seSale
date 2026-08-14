import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api-client";
import type {
  AdminLocation,
  AdminLocationFilters,
  Location,
  LocationAdminCreateInput,
  LocationAdminUpdateInput,
  LocationFilters,
} from "@/features/locations/types";

export async function fetchLocations(filters: LocationFilters): Promise<Location[]> {
  return apiGet<Location[]>("/api/locations", {
    city_id: filters.city_id,
    search: filters.search,
    place_type: filters.place_type,
  });
}

export async function fetchLocationById(locationId: string): Promise<Location> {
  return apiGet<Location>(`/api/locations/${locationId}`);
}

export async function fetchAdminLocations(filters: AdminLocationFilters): Promise<AdminLocation[]> {
  return apiGet<AdminLocation[]>("/api/admin/locations", {
    city_id: filters.city_id,
    is_public: filters.is_public != null ? String(filters.is_public) : undefined,
    is_verified: filters.is_verified != null ? String(filters.is_verified) : undefined,
    place_type: filters.place_type,
    search: filters.search,
  });
}

export async function createAdminLocation(input: LocationAdminCreateInput): Promise<AdminLocation> {
  return apiPost<AdminLocation>("/api/admin/locations", input);
}

export async function updateAdminLocation(
  locationId: string,
  input: LocationAdminUpdateInput,
): Promise<AdminLocation> {
  return apiPut<AdminLocation>(`/api/admin/locations/${locationId}`, input);
}

export async function verifyAdminLocation(locationId: string, isVerified: boolean): Promise<AdminLocation> {
  return apiPatch<AdminLocation>(`/api/admin/locations/${locationId}/verify`, { is_verified: isVerified });
}

export async function deleteAdminLocation(locationId: string): Promise<void> {
  return apiDelete<void>(`/api/admin/locations/${locationId}`);
}
