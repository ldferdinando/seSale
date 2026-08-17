import { apiGet } from "@/lib/api-client";
import type { AdSection, AdSlot } from "@/features/ads/types";

export async function fetchAdSlots(cityId: string, section: AdSection): Promise<AdSlot[]> {
  return apiGet<AdSlot[]>("/api/ads", { city_id: cityId, section });
}
