import { clearToken, getToken, setToken } from "@/features/auth/lib/token-store";
import type { TokenResponse } from "@/features/auth/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

let refreshPromise: Promise<boolean> | null = null;

async function trySilentRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(new URL("/api/auth/refresh", API_URL).toString(), {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        clearToken();
        return false;
      }
      const body = (await response.json()) as TokenResponse;
      setToken(body.access_token);
      return true;
    } catch {
      clearToken();
      return false;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

function isAuthEndpoint(path: string): boolean {
  return path.startsWith("/api/auth/");
}

async function fetchWithAuthRetry(url: string, init: RequestInit, skipRefreshRetry: boolean): Promise<Response> {
  const response = await fetch(url, { ...init, credentials: "include" });

  if (response.status !== 401 || skipRefreshRetry) {
    return response;
  }

  const refreshed = await trySilentRefresh();
  if (!refreshed) {
    return response;
  }

  return fetch(url, {
    ...init,
    credentials: "include",
    headers: { ...(init.headers as Record<string, string> | undefined), ...authHeaders() },
  });
}

export async function apiGet<T>(path: string, params?: Record<string, string | undefined>): Promise<T> {
  const url = new URL(path, API_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  const response = await fetchWithAuthRetry(
    url.toString(),
    { headers: authHeaders() },
    isAuthEndpoint(path),
  );

  if (!response.ok) {
    throw new ApiError(`Error al consultar ${path}`, response.status);
  }

  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetchWithAuthRetry(
    new URL(path, API_URL).toString(),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    },
    isAuthEndpoint(path),
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new ApiError(detail?.detail ?? `Error al enviar a ${path}`, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/**
 * POST multipart/form-data — Etapa 8b (subida de flyer). No se setea
 * Content-Type a mano: el navegador arma el boundary correcto solo si el
 * header no está seteado explícitamente.
 */
export async function apiPostFile<T>(path: string, file: File, fieldName = "file"): Promise<T> {
  const formData = new FormData();
  formData.append(fieldName, file);

  const response = await fetchWithAuthRetry(
    new URL(path, API_URL).toString(),
    {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    },
    false,
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new ApiError(detail?.detail ?? `Error al enviar a ${path}`, response.status);
  }

  return response.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const response = await fetchWithAuthRetry(
    new URL(path, API_URL).toString(),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders(), ...headers },
      body: JSON.stringify(body),
    },
    false,
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new ApiError(detail?.detail ?? `Error al enviar a ${path}`, response.status);
  }

  return response.json() as Promise<T>;
}

export async function apiDelete<T = void>(path: string): Promise<T> {
  const response = await fetchWithAuthRetry(
    new URL(path, API_URL).toString(),
    { method: "DELETE", headers: authHeaders() },
    false,
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new ApiError(detail?.detail ?? `Error al eliminar ${path}`, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const response = await fetchWithAuthRetry(
    new URL(path, API_URL).toString(),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    },
    false,
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new ApiError(detail?.detail ?? `Error al enviar a ${path}`, response.status);
  }

  return response.json() as Promise<T>;
}
