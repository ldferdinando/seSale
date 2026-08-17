import { apiDelete, apiGet, apiPatch, apiPost, apiPostFile, apiPut } from "@/lib/api-client";
import type {
  AdItemAdmin,
  AdItemCreateInput,
  AdItemStatus,
  AdItemUpdateInput,
  AdminAdItemFilters,
  AdSection,
  AdSlotAdmin,
} from "@/features/ads/types";

export async function fetchAdminAdSlots(cityId: string, section?: AdSection): Promise<AdSlotAdmin[]> {
  return apiGet<AdSlotAdmin[]>("/api/admin/ad-slots", { city_id: cityId, section });
}

export async function fetchAdminAdItems(filters: AdminAdItemFilters): Promise<AdItemAdmin[]> {
  return apiGet<AdItemAdmin[]>("/api/admin/ad-items", {
    city_id: filters.city_id,
    section: filters.section,
    status: filters.status,
    user_id: filters.user_id,
    date_from: filters.date_from,
    date_to: filters.date_to,
  });
}

export async function createAdItem(input: AdItemCreateInput): Promise<AdItemAdmin> {
  return apiPost<AdItemAdmin>("/api/admin/ad-items", input);
}

export async function updateAdItem(adItemId: string, input: AdItemUpdateInput): Promise<AdItemAdmin> {
  return apiPut<AdItemAdmin>(`/api/admin/ad-items/${adItemId}`, input);
}

export async function deleteAdItem(adItemId: string): Promise<void> {
  return apiDelete<void>(`/api/admin/ad-items/${adItemId}`);
}

export async function toggleAdItemStatus(adItemId: string, status: AdItemStatus): Promise<AdItemAdmin> {
  return apiPatch<AdItemAdmin>(`/api/admin/ad-items/${adItemId}/status`, { status });
}

export async function uploadAdItemImage(adItemId: string, file: File): Promise<AdItemAdmin> {
  return apiPostFile<AdItemAdmin>(`/api/admin/ad-items/${adItemId}/image`, file);
}

export async function reorderAdItems(slotId: string, orderedIds: string[]): Promise<AdItemAdmin[]> {
  return apiPatch<AdItemAdmin[]>("/api/admin/ad-items/reorder", { slot_id: slotId, ordered_ids: orderedIds });
}
