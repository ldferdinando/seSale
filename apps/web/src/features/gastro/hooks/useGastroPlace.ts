import { useQuery } from "@tanstack/react-query";

import { fetchGastroPlace } from "@/features/gastro/services/gastro-api";

/** Detalle público de un lugar gastronómico por id — /lugares/{id}. */
export function useGastroPlace(id: string | undefined) {
  return useQuery({
    queryKey: ["gastro-place", id],
    queryFn: () => fetchGastroPlace(id as string),
    enabled: Boolean(id),
    staleTime: 2 * 60 * 1000,
  });
}
