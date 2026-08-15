import { useQuery } from "@tanstack/react-query";

import { fetchAdminCities } from "@/features/cities/services/cities-api";

export function useAdminCities() {
  return useQuery({
    queryKey: ["admin-cities"],
    queryFn: fetchAdminCities,
    staleTime: 0,
  });
}
