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
  // Etapa 11a — BUG 5: el usuario puede editar su propio documento desde
  // /mi-cuenta.
  doc_type?: "dni" | "cuit";
  doc_number?: string;
  public_name?: string;
  public_whatsapp?: string;
  city_id?: string;
}

/** Etapa 11a — BUG 4: edición completa de un usuario por un admin, vía
 * PATCH /api/users/{id}. `email` queda afuera a propósito (identificador,
 * no se edita). */
export interface AdminUserEditInput {
  full_name?: string;
  public_name?: string;
  city_id?: string | null;
  doc_type?: "dni" | "cuit" | null;
  doc_number?: string | null;
  phone?: string | null;
  public_whatsapp?: string | null;
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
  // Etapa 9d — el admin ya verificó la identidad de esta persona por fuera
  // del sistema (llamada, presencial) antes de cargarla.
  is_verified?: boolean;
}
