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
