import { apiGet, apiPost } from "@/lib/api-client";
import type { LoginInput, RegisterInput, TokenResponse, User } from "@/features/auth/types";

export async function registerUser(input: RegisterInput): Promise<User> {
  return apiPost<User>("/api/auth/register", input);
}

export async function loginUser(input: LoginInput): Promise<TokenResponse> {
  return apiPost<TokenResponse>("/api/auth/login", input);
}

export async function refreshSession(): Promise<TokenResponse> {
  return apiPost<TokenResponse>("/api/auth/refresh", undefined);
}

export async function logoutUser(): Promise<void> {
  return apiPost<void>("/api/auth/logout", undefined);
}

export async function getCurrentUser(): Promise<User> {
  return apiGet<User>("/api/users/me");
}
