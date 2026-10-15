import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setGastroPlan, type SetGastroPlanInput } from "@/features/gastro/services/gastro-api";

/** Plan de visibilidad de un lugar con tipos (Gastronomía/Espacios), con
 * fechas de vigencia — Etapa "Lugares destacados temporales". El
 * alta/edición/listado del lugar en sí vive en el panel unificado de
 * Lugares (features/locations/hooks) — Etapa "Unificar panel admin de
 * Lugares". */
export function useSetGastroPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & SetGastroPlanInput) => setGastroPlan(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
      queryClient.invalidateQueries({ queryKey: ["gastro"] });
      queryClient.invalidateQueries({ queryKey: ["gastro-place", id] });
    },
  });
}
