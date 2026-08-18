import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createGastroPlace,
  deleteGastroCover,
  deleteGastroPlace,
  fetchAdminGastroPlaces,
  setGastroPlan,
  updateGastroPlace,
  uploadGastroCover,
  verifyGastroPlace,
} from "@/features/gastro/services/gastro-api";
import type {
  AdminGastroPlaceFilters,
  GastroPlaceCreateInput,
  GastroPlaceUpdateInput,
  GastroPlan,
} from "@/features/gastro/types";

const ADMIN_GASTRO_KEY = "admin-gastro";

function invalidateGastro(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  queryClient.invalidateQueries({ queryKey: [ADMIN_GASTRO_KEY] });
  queryClient.invalidateQueries({ queryKey: ["gastro"] });
  if (id) queryClient.invalidateQueries({ queryKey: ["gastro-place", id] });
}

export function useAdminGastroPlaces(filters: AdminGastroPlaceFilters) {
  return useQuery({
    queryKey: [ADMIN_GASTRO_KEY, filters],
    queryFn: () => fetchAdminGastroPlaces(filters),
    staleTime: 0,
  });
}

export function useCreateGastroPlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GastroPlaceCreateInput) => createGastroPlace(input),
    onSuccess: () => invalidateGastro(queryClient),
  });
}

export function useUpdateGastroPlace(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GastroPlaceUpdateInput) => updateGastroPlace(id, input),
    onSuccess: () => invalidateGastro(queryClient, id),
  });
}

export function useDeleteGastroPlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGastroPlace(id),
    onSuccess: () => invalidateGastro(queryClient),
  });
}

export function useVerifyGastroPlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isVerified }: { id: string; isVerified: boolean }) => verifyGastroPlace(id, isVerified),
    onSuccess: (_, { id }) => invalidateGastro(queryClient, id),
  });
}

export function useSetGastroPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: GastroPlan }) => setGastroPlan(id, plan),
    onSuccess: (_, { id }) => invalidateGastro(queryClient, id),
  });
}

export function useUploadGastroCover() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadGastroCover(id, file),
    onSuccess: (_, { id }) => invalidateGastro(queryClient, id),
  });
}

export function useDeleteGastroCover() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGastroCover(id),
    onSuccess: (_, id) => invalidateGastro(queryClient, id),
  });
}
