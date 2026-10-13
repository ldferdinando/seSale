import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setGastroPlan } from "@/features/gastro/services/gastro-api";
import type { GastroPlan } from "@/features/gastro/types";

/** Plan de visibilidad de un lugar con tipos (Gastronomía/Espacios). El
 * alta/edición/listado del lugar en sí vive en el panel unificado de
 * Lugares (features/locations/hooks) — Etapa "Unificar panel admin de
 * Lugares". */
export function useSetGastroPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: GastroPlan }) => setGastroPlan(id, plan),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
      queryClient.invalidateQueries({ queryKey: ["gastro"] });
      queryClient.invalidateQueries({ queryKey: ["gastro-place", id] });
    },
  });
}
