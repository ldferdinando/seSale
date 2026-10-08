import { act, cleanup, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace, back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/eventos/11111111-1111-1111-1111-111111111111/editar",
  useSearchParams: () => new URLSearchParams(),
}));

import { EditarEventoClient } from "@/app/eventos/[id]/editar/EditarEventoClient";
import { setRestoringSession } from "@/features/auth/lib/session-restore-store";
import { clearToken, setToken } from "@/features/auth/lib/token-store";
import { makeEventDetail, makeUser } from "./mocks/handlers";
import { server } from "./mocks/server";
import { renderWithActiveCity } from "./test-utils";

const API_URL = "http://localhost:8000";
const EVENT_ID = "11111111-1111-1111-1111-111111111111";
const LOGIN_URL = `/login?redirect=${encodeURIComponent(`/eventos/${EVENT_ID}/editar`)}`;

function mockOwnEvent() {
  const owner = makeUser();
  server.use(
    http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(owner)),
    http.get(`${API_URL}/api/events/:id`, () =>
      HttpResponse.json(makeEventDetail({ id: EVENT_ID, organizer_id: owner.id, date: "2099-01-01", date_end: "2099-01-01" })),
    ),
  );
}

// Simula una recarga completa de /eventos/{id}/editar: el access_token
// todavía no está en memoria y AuthProvider sigue restaurando la sesión con
// el refresh_token — antes del fix, el componente decidía "sin usuario" en
// ese instante y mandaba a /login a alguien con sesión válida.
describe("EditarEventoClient — guard de sesión en recarga completa", () => {
  afterEach(() => {
    cleanup();
    clearToken();
    push.mockClear();
    replace.mockClear();
  });

  it("con sesión válida no redirige a /login mientras se restaura la sesión, y entra al formulario", async () => {
    mockOwnEvent();
    setRestoringSession(true);
    renderWithActiveCity(<EditarEventoClient eventId={EVENT_ID} />);

    expect(screen.getByTestId("edit-event-loading")).toBeInTheDocument();
    // Le damos tiempo al efecto para que, si fuera a redirigir, lo haga.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();

    // AuthProvider termina de restaurar: token en memoria + fin del restore.
    act(() => {
      setToken("token-restaurado");
      setRestoringSession(false);
    });

    expect(await screen.findByRole("heading", { name: "Editar evento" })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("sin sesión redirige a /login recién cuando la restauración se resuelve como 'sin usuario'", async () => {
    setRestoringSession(true);
    renderWithActiveCity(<EditarEventoClient eventId={EVENT_ID} />);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();

    // El refresh falló: AuthProvider marca fin del restore sin setear token.
    act(() => setRestoringSession(false));

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith(LOGIN_URL));
    expect(push).not.toHaveBeenCalledWith(expect.stringContaining("/login"));
  });

  it("no redirige en el instante en que el token ya llegó pero /api/users/me todavía no respondió", async () => {
    let resolveMe: () => void = () => {};
    const owner = makeUser();
    server.use(
      http.get(`${API_URL}/api/users/me`, async () => {
        await new Promise<void>((resolve) => {
          resolveMe = resolve;
        });
        return HttpResponse.json(owner);
      }),
      http.get(`${API_URL}/api/events/:id`, () =>
        HttpResponse.json(makeEventDetail({ id: EVENT_ID, organizer_id: owner.id, date: "2099-01-01", date_end: "2099-01-01" })),
      ),
    );
    setToken("token-restaurado");
    renderWithActiveCity(<EditarEventoClient eventId={EVENT_ID} />);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByTestId("edit-event-loading")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();

    act(() => resolveMe());

    expect(await screen.findByRole("heading", { name: "Editar evento" })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirige al detalle con sinPermiso si el usuario logueado no es dueño ni admin", async () => {
    server.use(
      http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser({ id: "otro-usuario" }))),
      http.get(`${API_URL}/api/events/:id`, () => HttpResponse.json(makeEventDetail({ id: EVENT_ID }))),
    );
    setToken("test-token");
    renderWithActiveCity(<EditarEventoClient eventId={EVENT_ID} />);

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith(`/eventos/${EVENT_ID}?sinPermiso=1`));
    expect(replace).not.toHaveBeenCalled();
  });
});
