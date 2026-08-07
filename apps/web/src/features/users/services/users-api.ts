import { apiGet, apiPost, apiPut } from "@/lib/api-client";
import type { User } from "@/features/auth/types";
import type { AdminUserCreateInput, ProfileUpdateInput } from "@/features/users/types";

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
