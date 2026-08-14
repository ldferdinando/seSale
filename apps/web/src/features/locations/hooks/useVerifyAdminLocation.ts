import { useMutation, useQueryClient } from "@tanstack/react-query";

import { verifyAdminLocation } from "@/features/locations/services/locations-api";

export function useVerifyAdminLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ locationId, isVerified }: { locationId: string; isVerified: boolean }) =>
      verifyAdminLocation(locationId, isVerified),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}
