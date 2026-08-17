import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAdItem,
  deleteAdItem,
  fetchAdminAdSlots,
  reorderAdItems,
  toggleAdItemStatus,
  updateAdItem,
  uploadAdItemImage,
} from "@/features/ads/services/admin-ads-api";
import type { AdItemCreateInput, AdItemStatus, AdItemUpdateInput, AdSection } from "@/features/ads/types";

const ADMIN_AD_SLOTS_KEY = "admin-ad-slots";

function invalidateAds(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [ADMIN_AD_SLOTS_KEY] });
  queryClient.invalidateQueries({ queryKey: ["banners"] });
}

export function useAdminAdSlots(cityId: string | undefined, section: AdSection | undefined) {
  return useQuery({
    queryKey: [ADMIN_AD_SLOTS_KEY, cityId, section],
    queryFn: () => fetchAdminAdSlots(cityId as string, section),
    enabled: !!cityId,
    staleTime: 0,
  });
}

export function useCreateAdItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdItemCreateInput) => createAdItem(input),
    onSuccess: () => invalidateAds(queryClient),
  });
}

export function useUpdateAdItem(adItemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdItemUpdateInput) => updateAdItem(adItemId, input),
    onSuccess: () => invalidateAds(queryClient),
  });
}

export function useDeleteAdItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (adItemId: string) => deleteAdItem(adItemId),
    onSuccess: () => invalidateAds(queryClient),
  });
}

export function useToggleAdItemStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ adItemId, status }: { adItemId: string; status: AdItemStatus }) =>
      toggleAdItemStatus(adItemId, status),
    onSuccess: () => invalidateAds(queryClient),
  });
}

export function useUploadAdItemImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ adItemId, file }: { adItemId: string; file: File }) => uploadAdItemImage(adItemId, file),
    onSuccess: () => invalidateAds(queryClient),
  });
}

export function useReorderAdItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slotId, orderedIds }: { slotId: string; orderedIds: string[] }) =>
      reorderAdItems(slotId, orderedIds),
    onSuccess: () => invalidateAds(queryClient),
  });
}
