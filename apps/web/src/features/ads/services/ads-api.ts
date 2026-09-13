import { apiGet } from "@/lib/api-client";
import type { AdSection, AdSlot } from "@/features/ads/types";

export async function fetchAdSlots(
  cityId: string,
  section: AdSection,
  categoryKey?: string | null,
): Promise<AdSlot[]> {
  return apiGet<AdSlot[]>("/api/ads", {
    city_id: cityId,
    section,
    ...(categoryKey ? { category_key: categoryKey } : {}),
  });
}
