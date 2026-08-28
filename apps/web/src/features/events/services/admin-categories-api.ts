import { apiGet, apiPatch, apiPost, apiPut } from "@/lib/api-client";
import type { CategoryAdmin, CategoryCreateInput, CategoryUpdateInput } from "@/features/events/types";

export async function fetchAdminCategories(isActive?: boolean): Promise<CategoryAdmin[]> {
  return apiGet<CategoryAdmin[]>("/api/admin/categories", {
    is_active: isActive !== undefined ? String(isActive) : undefined,
  });
}

export async function createCategory(input: CategoryCreateInput): Promise<CategoryAdmin> {
  return apiPost<CategoryAdmin>("/api/admin/categories", input);
}

export async function updateCategory(id: string, input: CategoryUpdateInput): Promise<CategoryAdmin> {
  return apiPut<CategoryAdmin>(`/api/admin/categories/${id}`, input);
}

export async function toggleCategory(id: string): Promise<CategoryAdmin> {
  return apiPatch<CategoryAdmin>(`/api/admin/categories/${id}/toggle`, {});
}
