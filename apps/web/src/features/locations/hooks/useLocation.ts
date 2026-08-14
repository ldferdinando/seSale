import { useQuery } from "@tanstack/react-query";

import { fetchLocationById } from "@/features/locations/services/locations-api";

/** Detalle de un lugar por id — público o privado, para mostrarlo aunque no
 * sea un lugar precargado (ej. selección ya hecha en Tab A, o el mapa de
 * EventDetailView). */
export function useLocation(locationId: string | undefined) {
  return useQuery({
    queryKey: ["location", locationId],
    queryFn: () => fetchLocationById(locationId as string),
    enabled: Boolean(locationId),
  });
}
