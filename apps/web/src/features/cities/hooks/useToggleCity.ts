import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toggleCity } from "@/features/cities/services/cities-api";

export function useToggleCity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cityId: string) => toggleCity(cityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cities"] });
      queryClient.invalidateQueries({ queryKey: ["cities"] });
    },
  });
}
