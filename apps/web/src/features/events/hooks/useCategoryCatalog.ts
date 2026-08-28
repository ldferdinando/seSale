import { useQuery } from "@tanstack/react-query";

import { fetchCategories } from "@/features/events/services/categories-api";
import { EVENT_CATEGORIES, type Category } from "@/features/events/types";

const TEN_MINUTES = 10 * 60 * 1000;

/**
 * Categorías activas desde GET /api/categories (Etapa 12a) — reemplaza la
 * lista hardcodeada EVENT_CATEGORIES como fuente de verdad en el
 * formulario/filtros/card.
 *
 * `categories` nunca está vacío: mientras la query está en vuelo (o si
 * falla) devuelve la lista hardcodeada como fallback — así los consumidores
 * que no necesitan distinguir el estado de carga (chips, card, resumen)
 * pueden renderizar directo sin esperar un round-trip. El único lugar que
 * pide explícitamente un skeleton mientras carga es el selector de
 * categorías del formulario de evento (CategoryMultiSelect) — para eso se
 * expone `isLoading` aparte.
 */
export function useCategoryCatalog() {
  const query = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: TEN_MINUTES,
  });

  const fallback: Category[] = EVENT_CATEGORIES.map((c, i) => ({
    id: c.value,
    key: c.value,
    name: c.label,
    emoji: null,
    color: null,
    sort_order: i,
  }));

  return {
    categories: query.data ?? fallback,
    isLoading: query.isLoading,
    isError: query.isError,
    usingFallback: !query.data,
  };
}
