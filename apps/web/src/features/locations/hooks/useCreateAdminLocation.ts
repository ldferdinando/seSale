import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createAdminLocation } from "@/features/locations/services/locations-api";
import type { LocationAdminCreateInput } from "@/features/locations/types";

export function useCreateAdminLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LocationAdminCreateInput) => createAdminLocation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}
