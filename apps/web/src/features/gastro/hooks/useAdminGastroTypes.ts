import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createGastroType,
  fetchAdminGastroTypes,
  toggleGastroType,
  updateGastroType,
} from "@/features/gastro/services/gastro-api";
import type { GastroTypeCreateInput, GastroTypeUpdateInput } from "@/features/gastro/types";

export function useAdminGastroTypes(isActive?: boolean) {
  return useQuery({
    queryKey: ["admin-gastro-types", isActive],
    queryFn: () => fetchAdminGastroTypes(isActive),
    staleTime: 0,
  });
}

function useInvalidateGastroTypes() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["admin-gastro-types"] });
    queryClient.invalidateQueries({ queryKey: ["gastro-types"] });
  };
}

export function useCreateGastroType() {
  const invalidate = useInvalidateGastroTypes();
  return useMutation({
    mutationFn: (input: GastroTypeCreateInput) => createGastroType(input),
    onSuccess: invalidate,
  });
}

export function useUpdateGastroType(id: string) {
  const invalidate = useInvalidateGastroTypes();
  return useMutation({
    mutationFn: (input: GastroTypeUpdateInput) => updateGastroType(id, input),
    onSuccess: invalidate,
  });
}

export function useToggleGastroType() {
  const invalidate = useInvalidateGastroTypes();
  return useMutation({
    mutationFn: (id: string) => toggleGastroType(id),
    onSuccess: invalidate,
  });
}
