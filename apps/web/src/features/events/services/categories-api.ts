import { apiGet } from "@/lib/api-client";
import type { Category } from "@/features/events/types";

export async function fetchCategories(): Promise<Category[]> {
  return apiGet<Category[]>("/api/categories");
}
