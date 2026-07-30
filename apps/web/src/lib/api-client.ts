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

export async function apiGet<T>(path: string, params?: Record<string, string | undefined>): Promise<T> {
  const url = new URL(path, API_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new ApiError(`Error al consultar ${path}`, response.status);
  }

  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(new URL(path, API_URL).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new ApiError(detail?.detail ?? `Error al enviar a ${path}`, response.status);
  }

  return response.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const response = await fetch(new URL(path, API_URL).toString(), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new ApiError(detail?.detail ?? `Error al enviar a ${path}`, response.status);
  }

  return response.json() as Promise<T>;
}
