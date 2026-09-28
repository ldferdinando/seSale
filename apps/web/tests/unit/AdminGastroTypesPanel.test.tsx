import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { AdminGastroTypesPanel } from "@/features/admin/components/AdminGastroTypesPanel";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminGastroTypesPanel />
    </QueryClientProvider>,
  );
}

function rowFor(name: string): HTMLElement {
  const row = screen.getByText(name).closest<HTMLElement>("[data-testid='admin-gastro-type-row']");
  if (!row) throw new Error(`row for ${name} not found`);
  return row;
}

describe("AdminGastroTypesPanel", () => {
  it("shows the gastro type list", async () => {
    renderWithClient();

    expect(await screen.findByText("Bar")).toBeInTheDocument();
    expect(screen.getByText("bar")).toBeInTheDocument();
  });

  it("uses the 'Tipos de lugar' title", async () => {
    renderWithClient();

    expect(screen.getByRole("heading", { name: "Tipos de lugar" })).toBeInTheDocument();
  });

  it("shows the grupo badge of each type", async () => {
    renderWithClient();

    await screen.findByText("Bar");
    expect(within(rowFor("Bar")).getByTestId("admin-gastro-type-grupo")).toHaveTextContent("Gastronomía");
    expect(within(rowFor("Club")).getByTestId("admin-gastro-type-grupo")).toHaveTextContent("Espacios");
  });

  it("filters the list by grupo", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await screen.findByText("Bar");
    await user.selectOptions(screen.getByLabelText("Filtrar por grupo"), "espacios");

    expect(screen.queryByText("Bar")).not.toBeInTheDocument();
    expect(screen.getByText("Club")).toBeInTheDocument();
  });

  it("create form defaults grupo to Gastronomía and sends the selected grupo", async () => {
    let body: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_URL}/api/admin/gastro-types`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { id: "new", is_active: true, created_at: "2026-01-01T00:00:00Z", sort_order: 99, emoji: null, ...body },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    await user.click(await screen.findByRole("button", { name: /Nuevo tipo/ }));
    const grupoSelect = screen.getByLabelText("Grupo");
    expect(grupoSelect).toHaveValue("gastro");

    await user.type(screen.getByLabelText(/Key/), "Teatro independiente");
    await user.type(screen.getByLabelText("Nombre *"), "Teatro independiente");
    await user.selectOptions(grupoSelect, "espacios");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toMatchObject({ key: "teatro-independiente", name: "Teatro independiente", grupo: "espacios" });
  });

  it("strips accents when normalizing the key", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await user.click(await screen.findByRole("button", { name: /Nuevo tipo/ }));
    await user.type(screen.getByLabelText(/Key/), "Salón");

    expect(screen.getByLabelText(/Key/)).toHaveValue("salon");
  });

  it("edit form preloads the grupo, warns when it changes and sends it", async () => {
    let body: Record<string, unknown> | null = null;
    server.use(
      http.put(`${API_URL}/api/admin/gastro-types/:id`, async ({ params, request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          id: params.id,
          key: "club",
          is_active: true,
          created_at: "2026-01-01T00:00:00Z",
          ...body,
        });
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    await screen.findByText("Club");
    await user.click(within(rowFor("Club")).getByRole("button", { name: "Editar" }));

    const grupoSelect = screen.getByLabelText("Grupo");
    expect(grupoSelect).toHaveValue("espacios");
    expect(screen.queryByTestId("gt-grupo-warning")).not.toBeInTheDocument();

    await user.selectOptions(grupoSelect, "gastro");
    expect(screen.getByTestId("gt-grupo-warning")).toHaveTextContent(
      "Los lugares con este tipo pasarán a verse en el otro grupo",
    );

    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toMatchObject({ name: "Club", grupo: "gastro" });
  });

  it("shows the backend message when the key already exists", async () => {
    server.use(
      http.post(`${API_URL}/api/admin/gastro-types`, () =>
        HttpResponse.json({ detail: "Ya existe un tipo de lugar con la key 'bar'. Elegí otra." }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    renderWithClient();

    await user.click(await screen.findByRole("button", { name: /Nuevo tipo/ }));
    await user.type(screen.getByLabelText(/Key/), "bar");
    await user.type(screen.getByLabelText("Nombre *"), "Bar");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Ya existe un tipo de lugar con la key 'bar'");
  });

  it("lets the admin pick an emoji with a click (no emoji keyboard needed) and clear it", async () => {
    let body: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_URL}/api/admin/gastro-types`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { id: "new", is_active: true, created_at: "2026-01-01T00:00:00Z", sort_order: 99, grupo: "gastro", ...body },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    await user.click(await screen.findByRole("button", { name: /Nuevo tipo/ }));
    await user.type(screen.getByLabelText(/Key/), "teatro");
    await user.type(screen.getByLabelText("Nombre *"), "Teatro");

    await user.click(screen.getByRole("button", { name: "Usar 🎸" }));
    expect(screen.getByLabelText("Emoji")).toHaveValue("🎸");
    await user.click(screen.getByRole("button", { name: "Quitar" }));
    expect(screen.getByLabelText("Emoji")).toHaveValue("");

    await user.click(screen.getByRole("button", { name: "Usar 🎭" }));
    expect(screen.getByRole("button", { name: "Usar 🎭" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toMatchObject({ key: "teatro", emoji: "🎭" });
  });
});
