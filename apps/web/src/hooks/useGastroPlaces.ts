import { useQuery } from "@tanstack/react-query";

import { fetchGastroPlaces } from "@/features/gastro/services/gastro-api";
import type { GastroPlace } from "@/features/gastro/types";

interface UseGastroPlacesParams {
  cityId: string | null;
  gastroType?: string | null;
  search?: string;
  hasDelivery?: boolean;
  hasReservations?: boolean;
  priceRange?: string | null;
}

interface UseGastroPlacesReturn {
  places: GastroPlace[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Centraliza el fetch de lugares gastronómicos (GET /api/gastro) — Etapa 8e.
 * Mismo patrón que useBannerSlots/useEvents: TanStack Query, enabled solo
 * con ciudad activa.
 */
export function useGastroPlaces({
  cityId,
  gastroType,
  search,
  hasDelivery,
  hasReservations,
  priceRange,
}: UseGastroPlacesParams): UseGastroPlacesReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: ["gastro", cityId, gastroType, search, hasDelivery, hasReservations, priceRange],
    queryFn: () =>
      fetchGastroPlaces({
        city_id: cityId as string,
        gastro_type: gastroType ?? undefined,
        search: search || undefined,
        has_delivery: hasDelivery,
        has_reservations: hasReservations,
        price_range: priceRange ?? undefined,
      }),
    enabled: !!cityId,
    staleTime: 2 * 60 * 1000,
  });

  return {
    places: data ?? [],
    isLoading: !!cityId && isLoading,
    error: error as Error | null,
  };
}
