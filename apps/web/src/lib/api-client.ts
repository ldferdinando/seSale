import { clearToken, getToken, setToken } from "@/features/auth/lib/token-store";
import type { TokenResponse } from "@/features/auth/types";

// Etapa 9f — todas las requests van a rutas relativas (mismo origen que el
// frontend) y next.config.js las reenvía al backend real vía rewrite. Nunca
// se le pega directo al backend (Railway) desde acá.
//
// Es necesario porque frontend y backend viven en dominios distintos
// (Vercel / Railway): un fetch directo cross-domain hace que las cookies de
// sesión (has_session, refresh_token) queden scopeadas al dominio del
// backend — nunca llegan al middleware de Next.js (que corre en el dominio
// del frontend) y, con SameSite=Strict, tampoco se reenvían en llamados
// posteriores. Resolviendo todo contra el propio origen, las cookies quedan
// seteadas para el dominio del frontend y el flujo funciona igual que si
// fuera un único backend.
function resolveUrl(path: string): URL {
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  return new URL(path, origin);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Extrae un mensaje legible del body de error de la API.
 *
 * Bug real reportado: `detail?.detail ?? fallback` se pasaba directo como
 * `message` de `ApiError` (que extiende `Error`). FastAPI devuelve, en
 * errores de validación (422), `detail` como un ARRAY de objetos
 * `{ msg, loc, type }` — no un string — y `new Error(unArray)` hace
 * `String(array)` internamente, que para un array de un solo objeto da
 * literalmente el texto "[object Object]" en vez del mensaje. Acá se
 * cubren las formas que devuelve el backend: `detail` string (HTTPException
 * simple), `detail` array de objetos de validación (Pydantic/FastAPI), o
 * ninguna de las anteriores (fallback).
 */
function extractErrorMessage(body: unknown, fallback: string): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string" && detail) {
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && typeof (first as { msg?: unknown }).msg === "string") {
      return (first as { msg: string }).msg;
    }
  }
  return fallback;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Cookie liviana (no HttpOnly) que el backend setea junto al refresh_token
// real en login/refresh (ver auth.py::_set_refresh_cookie). Si no está
// presente, no puede haber una sesión válida que refrescar: evitamos el
// POST /api/auth/refresh que de otro modo daría 401 de forma esperada pero
// ruidosa en la consola cada vez que se monta la app sin sesión iniciada.
export function hasSessionCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((entry) => entry.startsWith("has_session="));
}

// Único punto de entrada para refrescar la sesión: tanto el restore inicial
// de AuthProvider como el reintento automático de fetchWithAuthRetry ante un
// 401 pasan por acá y comparten la misma promesa en vuelo. Es necesario
// porque el backend ROTA el refresh_token en cada uso (ver
// rotate_refresh_token en auth_service.py): dos POST /api/auth/refresh
// concurrentes con la cookie vieja hacen que el segundo en llegar reciba
// siempre 401, aunque la sesión sea válida.
let refreshPromise: Promise<TokenResponse | null> | null = null;

async function doRefresh(): Promise<TokenResponse | null> {
  if (!hasSessionCookie()) return null;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(resolveUrl("/api/auth/refresh").toString(), {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        clearToken();
        return null;
      }
      const body = (await response.json()) as TokenResponse;
      setToken(body.access_token);
      return body;
    } catch {
      clearToken();
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function trySilentRefresh(): Promise<boolean> {
  return (await doRefresh()) !== null;
}

// Usado por AuthProvider para restaurar la sesión al montar la app.
export async function restoreSession(): Promise<TokenResponse> {
  const body = await doRefresh();
  if (!body) {
    throw new Error("No hay sesión activa");
  }
  return body;
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
  const url = resolveUrl(path);
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
    resolveUrl(path).toString(),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    },
    isAuthEndpoint(path),
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(extractErrorMessage(body, `Error al enviar a ${path}`), response.status);
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
    resolveUrl(path).toString(),
    {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    },
    false,
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(extractErrorMessage(body, `Error al enviar a ${path}`), response.status);
  }

  return response.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const response = await fetchWithAuthRetry(
    resolveUrl(path).toString(),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders(), ...headers },
      body: JSON.stringify(body),
    },
    false,
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(extractErrorMessage(body, `Error al enviar a ${path}`), response.status);
  }

  return response.json() as Promise<T>;
}

export async function apiDelete<T = void>(path: string): Promise<T> {
  const response = await fetchWithAuthRetry(
    resolveUrl(path).toString(),
    { method: "DELETE", headers: authHeaders() },
    false,
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(extractErrorMessage(body, `Error al eliminar ${path}`), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const response = await fetchWithAuthRetry(
    resolveUrl(path).toString(),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    },
    false,
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(extractErrorMessage(body, `Error al enviar a ${path}`), response.status);
  }

  return response.json() as Promise<T>;
}
