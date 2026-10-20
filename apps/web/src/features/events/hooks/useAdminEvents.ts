import { useQuery } from "@tanstack/react-query";

import { fetchAdminEvents } from "@/features/events/services/events-api";
import type { AdminEventFilters } from "@/features/events/types";

export function useAdminEvents(filters: AdminEventFilters) {
  return useQuery({
    queryKey: ["admin-events", filters],
    queryFn: () => fetchAdminEvents(filters),
  });
}

/**
 * Feature "Duplicar evento" — trae las otras instancias del mismo grupo
 * (eventos duplicados entre sí) para el panel admin, sin depender de los
 * filtros/paginación actuales del listado principal. `include_deleted:
 * true` porque un grupo puede tener una instancia ya eliminada y aun así
 * vale mostrarla en el link rápido (es solo informativo).
 */
export function useEventInstanceSiblings(groupId: string | null | undefined) {
  return useQuery({
    queryKey: ["admin-events", "instances", groupId],
    queryFn: () => fetchAdminEvents({ instance_group_id: groupId ?? undefined, include_deleted: true }),
    enabled: Boolean(groupId),
  });
}
