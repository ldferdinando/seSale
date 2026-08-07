export interface User {
  id: string;
  email: string;
  role: "user" | "admin";
  is_active: boolean;
  full_name: string;
  doc_type: string | null;
  doc_number: string | null;
  phone: string | null;
  phone_verified: boolean;
  email_verified: boolean;
  public_name: string;
  public_whatsapp: string | null;
  city_id: string | null;
  is_verified: boolean;
  created_at: string;
  created_by: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface City {
  id: string;
  name: string;
  province: string;
  emoji: string;
  is_active: boolean;
  sort_order: number;
}

export interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
  doc_type?: string;
  doc_number?: string;
  phone?: string;
  public_name: string;
  public_whatsapp?: string;
  city_id?: string;
}
