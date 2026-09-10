import { useQuery } from "@tanstack/react-query";

import { fetchCategoryCounts } from "@/features/events/services/categories-api";

const FIVE_MINUTES = 5 * 60 * 1000;

/**
 * Etapa 13a — conteo de eventos por categoría para la ciudad activa, usado por
 * la grilla de `/categorias`. `counts` es `{}` mientras la query está en vuelo
 * o si `cityId` todavía no está disponible (ciudad detectándose).
 */
export function useCategoryCounts(cityId: string | undefined) {
  const query = useQuery({
    queryKey: ["category-counts", cityId],
    queryFn: () => fetchCategoryCounts(cityId as string),
    enabled: !!cityId,
    staleTime: FIVE_MINUTES,
  });

  return {
    counts: query.data ?? {},
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
