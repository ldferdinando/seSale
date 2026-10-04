import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchAdminSiteSettings, updateSiteSettings } from "@/features/site-settings/services/site-settings-api";
import type { SiteSettingsUpdateInput } from "@/features/site-settings/types";

export function useAdminSiteSettings() {
  return useQuery({ queryKey: ["admin-site-settings"], queryFn: fetchAdminSiteSettings, staleTime: 0 });
}

export function useUpdateSiteSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SiteSettingsUpdateInput) => updateSiteSettings(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-site-settings"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    },
  });
}
