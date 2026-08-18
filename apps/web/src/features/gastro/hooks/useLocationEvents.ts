import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/lib/api-client";
import type { Event } from "@/features/events/types";

/**
 * Próximos eventos de un lugar puntual — sección "Eventos en este lugar"
 * del detalle de gastronomía (Etapa 8e, PARTE 7: GET /api/events acepta
 * location_id). Se muestran los primeros 3, más recientes primero (mismo
 * orden que el resto del listado — ver ARCHITECTURE.md).
 */
export function useLocationEvents(locationId: string | undefined) {
  return useQuery({
    queryKey: ["events-by-location", locationId],
    queryFn: () => apiGet<Event[]>("/api/events", { location_id: locationId }),
    enabled: Boolean(locationId),
    staleTime: 2 * 60 * 1000,
  });
}
