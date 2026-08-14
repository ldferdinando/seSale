import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteAdminLocation } from "@/features/locations/services/locations-api";

export function useDeleteAdminLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (locationId: string) => deleteAdminLocation(locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}
