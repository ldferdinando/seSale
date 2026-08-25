import { apiGet, apiPatch, apiPost, apiPut } from "@/lib/api-client";
import type { User } from "@/features/auth/types";
import type {
  AdminUserCreateInput,
  AdminUserEditInput,
  ProfileUpdateInput,
  UserAdmin,
  UserAdminFilters,
} from "@/features/users/types";

export async function updateProfile(input: ProfileUpdateInput): Promise<User> {
  return apiPut<User>("/api/users/me", input);
}

export async function fetchUsers(search?: string): Promise<User[]> {
  const users = await apiGet<User[]>("/api/users");
  if (!search) return users;
  const query = search.trim().toLowerCase();
  return users.filter(
    (user) => user.public_name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query),
  );
}

export async function createUserByAdmin(input: AdminUserCreateInput): Promise<User> {
  return apiPost<User>("/api/admin/users", input);
}

/** Etapa 9b — listado completo para el panel admin (todos los roles/estados,
 * sin paginación), filtrado server-side. */
export async function fetchAdminUsers(filters: UserAdminFilters): Promise<UserAdmin[]> {
  return apiGet<UserAdmin[]>("/api/admin/users", {
    search: filters.search,
    role: filters.role,
    is_active: filters.is_active === undefined ? undefined : String(filters.is_active),
    city_id: filters.city_id,
  });
}

export async function updateUserRole(userId: string, role: "user" | "admin"): Promise<User> {
  return apiPatch<User>(`/api/users/${userId}/role`, { role });
}

export async function updateUserActive(userId: string, isActive: boolean): Promise<User> {
  return apiPatch<User>(`/api/users/${userId}`, { is_active: isActive });
}

/** Etapa 9d — toggle bidireccional (PATCH /api/users/{id}/verify acepta
 * {is_verified} desde esta etapa; antes solo verificaba, sin body). */
export async function updateUserVerified(userId: string, isVerified: boolean): Promise<User> {
  return apiPatch<User>(`/api/users/${userId}/verify`, { is_verified: isVerified });
}

/** Etapa 11a — BUG 4: edición completa de un usuario por el admin, mismo
 * endpoint que updateUserActive (PATCH /api/users/{id}) — el backend acepta
 * cualquier combinación de campos de AdminUserUpdate. */
export async function updateUserAdmin(userId: string, input: AdminUserEditInput): Promise<User> {
  return apiPatch<User>(`/api/users/${userId}`, input);
}
