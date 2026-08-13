import { useQuery } from "@tanstack/react-query";

import { fetchMySubscriptions } from "@/features/subscriptions/services/subscriptions-api";

export function useMySubscriptions(enabled: boolean) {
  return useQuery({
    queryKey: ["my-subscriptions"],
    queryFn: fetchMySubscriptions,
    enabled,
    // El estado pendiente/aprobado cambia por acciones de otra persona (el
    // admin) — el staleTime global de 60s (QueryProvider) hacía que, al
    // volver a Mi cuenta poco después de avisar la transferencia, se
    // siguiera mostrando el estado cacheado anterior. Siempre refetch al
    // montar para reflejar la acción recién hecha.
    staleTime: 0,
  });
}
