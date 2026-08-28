import { useQuery } from "@tanstack/react-query";

import { fetchGastroTypes } from "@/features/gastro/services/gastro-api";
import { GASTRO_TYPE_OPTIONS, type GastroType } from "@/features/gastro/types";

const TEN_MINUTES = 10 * 60 * 1000;

/**
 * Tipos gastronómicos activos desde GET /api/gastro-types (Etapa 12a) —
 * reemplaza GASTRO_TYPE_OPTIONS hardcodeado como fuente de verdad en el
 * formulario admin y los chips de filtro.
 *
 * `types` nunca está vacío: mientras la query está en vuelo (o si falla)
 * devuelve la lista hardcodeada como fallback — mismo criterio que
 * useCategoryCatalog (ver ahí el porqué de no gatear por `isLoading`
 * acá salvo que el consumidor lo pida explícitamente).
 */
export function useGastroTypeCatalog() {
  const query = useQuery({
    queryKey: ["gastro-types"],
    queryFn: fetchGastroTypes,
    staleTime: TEN_MINUTES,
  });

  const fallback: GastroType[] = GASTRO_TYPE_OPTIONS.map((t, i) => ({
    id: t.value,
    key: t.value,
    name: t.label,
    emoji: null,
    sort_order: i,
  }));

  return {
    types: query.data ?? fallback,
    isLoading: query.isLoading,
    isError: query.isError,
    usingFallback: !query.data,
  };
}
