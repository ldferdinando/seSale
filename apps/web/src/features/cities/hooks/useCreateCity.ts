import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createCity } from "@/features/cities/services/cities-api";
import type { CityCreateInput } from "@/features/cities/types";

export function useCreateCity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CityCreateInput) => createCity(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cities"] });
      queryClient.invalidateQueries({ queryKey: ["cities"] });
    },
  });
}
