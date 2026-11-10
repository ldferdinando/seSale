import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteCity } from "@/features/cities/services/cities-api";

export function useDeleteCity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cityId: string) => deleteCity(cityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cities"] });
      queryClient.invalidateQueries({ queryKey: ["cities"] });
    },
  });
}
