import { useQuery } from "@tanstack/react-query";

import { fetchSiteSettings } from "@/features/site-settings/services/site-settings-api";

export function useSiteSettings() {
  return useQuery({ queryKey: ["site-settings"], queryFn: fetchSiteSettings });
}
