import { useQuery } from "@tanstack/react-query";

import { fetchAdSlots } from "@/features/ads/services/ads-api";
import type { AdSection, AdSlot } from "@/features/ads/types";

interface UseBannerSlotsParams {
  cityId: string | null;
  section: AdSection;
  enabled?: boolean;
}

interface UseBannerSlotsReturn {
  slots: AdSlot[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Centraliza el fetch de banners (GET /api/ads) para que cualquier pantalla
 * los pueda consumir — Etapa 8d. Los banners no cambian frecuentemente, de
 * ahí el staleTime largo.
 */
export function useBannerSlots({ cityId, section, enabled }: UseBannerSlotsParams): UseBannerSlotsReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: ["banners", cityId, section],
    queryFn: () => fetchAdSlots(cityId as string, section),
    enabled: enabled !== false && !!cityId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    slots: data ?? [],
    isLoading: enabled !== false && !!cityId && isLoading,
    error: error as Error | null,
  };
}
