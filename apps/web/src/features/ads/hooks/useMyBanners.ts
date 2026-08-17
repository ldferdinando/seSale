import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/lib/api-client";
import type { MyAdItem } from "@/features/ads/types";

export function useMyBanners() {
  return useQuery({
    queryKey: ["my-banners"],
    queryFn: () => apiGet<MyAdItem[]>("/api/users/me/banners"),
  });
}
