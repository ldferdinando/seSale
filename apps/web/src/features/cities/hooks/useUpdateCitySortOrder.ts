import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateCitySortOrder } from "@/features/cities/services/cities-api";

export function useUpdateCitySortOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cityId, sortOrder }: { cityId: string; sortOrder: number }) =>
      updateCitySortOrder(cityId, sortOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cities"] });
      queryClient.invalidateQueries({ queryKey: ["cities"] });
    },
  });
}
