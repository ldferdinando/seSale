import type { User } from "@/features/auth/types";

/** Etapa 9b — listado admin: extiende User con datos calculados por el
 * backend (no viven en el modelo User) para el panel de usuarios. */
export interface UserAdmin extends User {
  city_name: string | null;
  event_count: number;
}

export interface UserAdminFilters {
  search?: string;
  role?: "user" | "admin";
  is_active?: boolean;
  city_id?: string;
}

export interface ProfileUpdateInput {
  full_name?: string;
  phone?: string;
  public_name?: string;
  public_whatsapp?: string;
  city_id?: string;
}

export interface AdminUserCreateInput {
  email: string;
  password: string;
  public_name: string;
  full_name: string;
  city_id?: string;
  role: "user" | "admin";
  doc_type?: "dni" | "cuit";
  doc_number?: string;
  phone?: string;
}
