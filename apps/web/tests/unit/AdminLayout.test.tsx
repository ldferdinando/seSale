import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

import AdminLayout from "@/app/admin/layout";
import { clearToken, setToken } from "@/features/auth/lib/token-store";
import { setRestoringSession } from "@/features/auth/lib/session-restore-store";
import { makeUser } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderLayout() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminLayout>
        <p>Contenido admin</p>
      </AdminLayout>
    </QueryClientProvider>,
  );
}

describe("AdminLayout (Etapa 9e)", () => {
  beforeEach(() => {
    // Por default, cada test arranca con la restauración de sesión ya
    // resuelta (el único test que necesita el estado "todavía restaurando"
    // lo pisa explícitamente).
    setRestoringSession(false);
  });

  afterEach(() => {
    // Unmount ANTES de tocar los singletons (token-store, session-restore-
    // store) — si el componente siguiera montado cuando clearToken()
    // notifica a sus listeners, dispararía un re-render/efecto extra que
    // termina contando como una llamada a replace() del test siguiente.
    cleanup();
    clearToken();
    replace.mockClear();
  });

  it("no redirige mientras la sesión todavía se está restaurando", () => {
    setRestoringSession(true);
    renderLayout();

    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByText("Contenido admin")).not.toBeInTheDocument();
  });

  it("redirige a / cuando no hay sesión", async () => {
    renderLayout();

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByText("Contenido admin")).not.toBeInTheDocument();
  });

  it("redirige a / cuando el usuario logueado no es admin", async () => {
    server.use(http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser({ role: "user" }))));
    setToken("test-token");
    renderLayout();

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByText("Contenido admin")).not.toBeInTheDocument();
  });

  it("renderiza los children cuando el usuario es admin", async () => {
    server.use(http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser({ role: "admin" }))));
    setToken("test-token");
    renderLayout();

    expect(await screen.findByText("Contenido admin")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
