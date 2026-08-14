import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateAdminLocation } from "@/features/locations/services/locations-api";
import type { LocationAdminUpdateInput } from "@/features/locations/types";

export function useUpdateAdminLocation(locationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LocationAdminUpdateInput) => updateAdminLocation(locationId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["location", locationId] });
    },
  });
}
