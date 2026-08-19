import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { refreshSession } from "@/features/auth/services/auth-api";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function setHasSessionCookie(present: boolean) {
  document.cookie = "has_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  if (present) {
    document.cookie = "has_session=1; path=/";
  }
}

// AuthProvider llama a refreshSession() en cada montaje de la app (ver
// AuthProvider.tsx). Sin esta guardia, eso disparaba siempre un
// POST /api/auth/refresh que daba 401 de forma esperada pero ruidosa en la
// consola cuando todavía no había sesión iniciada — el bug reportado.
describe("refreshSession", () => {
  beforeEach(() => {
    setHasSessionCookie(false);
  });

  it("no llama a /api/auth/refresh cuando no hay cookie has_session", async () => {
    const refreshSpy = vi.fn();
    server.use(
      http.post(`${API_URL}/api/auth/refresh`, () => {
        refreshSpy();
        return HttpResponse.json({ access_token: "nuevo", token_type: "bearer", expires_in: 1800 });
      }),
    );

    await expect(refreshSession()).rejects.toThrow();

    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it("llama a /api/auth/refresh y devuelve el token cuando la cookie has_session está presente", async () => {
    setHasSessionCookie(true);
    server.use(
      http.post(`${API_URL}/api/auth/refresh`, () =>
        HttpResponse.json({ access_token: "nuevo-token", token_type: "bearer", expires_in: 1800 }),
      ),
    );

    const result = await refreshSession();

    expect(result.access_token).toBe("nuevo-token");
  });
});
