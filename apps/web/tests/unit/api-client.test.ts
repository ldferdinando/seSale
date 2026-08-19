import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { refreshSession } from "@/features/auth/services/auth-api";
import { clearToken } from "@/features/auth/lib/token-store";
import { apiGet } from "@/lib/api-client";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function setHasSessionCookie(present: boolean) {
  document.cookie = "has_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  if (present) {
    document.cookie = "has_session=1; path=/";
  }
}

describe("api-client — guardia de trySilentRefresh contra el 401 ruidoso", () => {
  beforeEach(() => {
    setHasSessionCookie(false);
    clearToken();
  });

  it("no llama a /api/auth/refresh cuando no hay cookie has_session (no hay sesión posible)", async () => {
    const refreshSpy = vi.fn();
    server.use(
      http.get(`${API_URL}/api/protegido`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${API_URL}/api/auth/refresh`, () => {
        refreshSpy();
        return HttpResponse.json({ access_token: "nuevo", token_type: "bearer", expires_in: 1800 });
      }),
    );

    await expect(apiGet("/api/protegido")).rejects.toMatchObject({ status: 401 });

    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it("sí llama a /api/auth/refresh y reintenta cuando la cookie has_session está presente", async () => {
    setHasSessionCookie(true);
    let protectedCalls = 0;
    server.use(
      http.get(`${API_URL}/api/protegido`, () => {
        protectedCalls += 1;
        if (protectedCalls === 1) return new HttpResponse(null, { status: 401 });
        return HttpResponse.json({ ok: true });
      }),
      http.post(`${API_URL}/api/auth/refresh`, () =>
        HttpResponse.json({ access_token: "nuevo-token", token_type: "bearer", expires_in: 1800 }),
      ),
    );

    const result = await apiGet<{ ok: boolean }>("/api/protegido");

    expect(result).toEqual({ ok: true });
    expect(protectedCalls).toBe(2);
  });

  it("no dispara dos POST /api/auth/refresh concurrentes cuando el restore de sesión de AuthProvider y el reintento de una consulta protegida coinciden (el backend rota el refresh_token y el segundo daría 401)", async () => {
    setHasSessionCookie(true);
    let refreshCalls = 0;
    server.use(
      http.get(`${API_URL}/api/protegido`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${API_URL}/api/auth/refresh`, () => {
        refreshCalls += 1;
        if (refreshCalls > 1) {
          // Simula la rotación real del backend: una segunda llamada
          // concurrente con la cookie vieja recibe 401.
          return new HttpResponse(null, { status: 401 });
        }
        return HttpResponse.json({ access_token: "nuevo-token", token_type: "bearer", expires_in: 1800 });
      }),
    );

    // apiGet dispara su propio trySilentRefresh al recibir 401;
    // refreshSession() (el llamado de AuthProvider al montar) corre en
    // paralelo — ambos deben compartir la misma llamada en vuelo.
    const [, sessionResult] = await Promise.all([apiGet("/api/protegido").catch(() => null), refreshSession()]);

    expect(refreshCalls).toBe(1);
    expect(sessionResult.access_token).toBe("nuevo-token");
  });
});
