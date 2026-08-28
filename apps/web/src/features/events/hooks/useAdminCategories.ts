import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createCategory,
  fetchAdminCategories,
  toggleCategory,
  updateCategory,
} from "@/features/events/services/admin-categories-api";
import type { CategoryCreateInput, CategoryUpdateInput } from "@/features/events/types";

export function useAdminCategories(isActive?: boolean) {
  return useQuery({
    queryKey: ["admin-categories", isActive],
    queryFn: () => fetchAdminCategories(isActive),
    staleTime: 0,
  });
}

function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };
}

export function useCreateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (input: CategoryCreateInput) => createCategory(input),
    onSuccess: invalidate,
  });
}

export function useUpdateCategory(id: string) {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (input: CategoryUpdateInput) => updateCategory(id, input),
    onSuccess: invalidate,
  });
}

export function useToggleCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (id: string) => toggleCategory(id),
    onSuccess: invalidate,
  });
}
