import { apiGet, apiPost, restoreSession } from "@/lib/api-client";
import type { LoginInput, RegisterInput, TokenResponse, User } from "@/features/auth/types";

export async function registerUser(input: RegisterInput): Promise<User> {
  return apiPost<User>("/api/auth/register", input);
}

export async function loginUser(input: LoginInput): Promise<TokenResponse> {
  return apiPost<TokenResponse>("/api/auth/login", input);
}

export async function refreshSession(): Promise<TokenResponse> {
  // restoreSession() comparte la misma promesa de refresh en vuelo que usa
  // fetchWithAuthRetry (ver api-client.ts): evita que el restore de sesión
  // de AuthProvider y el reintento automático de otro endpoint disparen dos
  // POST /api/auth/refresh concurrentes, algo que el backend rechaza con 401
  // en el segundo porque rota el refresh_token en cada uso.
  return restoreSession();
}

export async function logoutUser(): Promise<void> {
  return apiPost<void>("/api/auth/logout", undefined);
}

export async function getCurrentUser(): Promise<User> {
  return apiGet<User>("/api/users/me");
}
