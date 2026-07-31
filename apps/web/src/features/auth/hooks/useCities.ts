import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/lib/api-client";
import type { City } from "@/features/auth/types";

export function useCities() {
  return useQuery({
    queryKey: ["cities"],
    queryFn: () => apiGet<City[]>("/api/cities"),
  });
}
