import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

import { AdItemFormModal } from "@/features/ads/components/AdItemFormModal";
import { makeAdItemAdmin, makeAdSlotAdmin } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function makeUser(id: string, publicName: string, email: string) {
  return { id, public_name: publicName, email, role: "user", is_active: true, full_name: "a", doc_type: null, doc_number: null, phone: null, phone_verified: false, email_verified: false, public_whatsapp: null, city_id: null, is_verified: false, created_at: "2024-01-01", created_by: null };
}

const USERS = [makeUser("u1", "Bar Uno", "uno@x.com"), makeUser("u2", "Teatro Dos", "dos@x.com")];

function renderModal(props: { item?: ReturnType<typeof makeAdItemAdmin> } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSave = vi.fn().mockResolvedValue({ id: "new-item" });
  render(
    <QueryClientProvider client={queryClient}>
      <AdItemFormModal
        slot={makeAdSlotAdmin()}
        item={props.item}
        onSave={onSave}
        isSaving={false}
        saveError={null}
        onCancel={() => {}}
      />
    </QueryClientProvider>,
  );
  return onSave;
}

function mockUsers(users: unknown[] = USERS) {
  server.use(http.get(`${API_URL}/api/users`, () => HttpResponse.json(users)));
}

describe("AdItemFormModal — selector de anunciante", () => {
  it('shows "Cargando usuarios..." while GET /api/users is pending', async () => {
    // Resolución controlada a mano: el estado de loading queda garantizado
    // en vez de depender del timing de la máquina.
    let resolveUsers!: (users: unknown[]) => void;
    const usersResponse = new Promise<unknown[]>((resolve) => {
      resolveUsers = resolve;
    });
    server.use(
      http.get(`${API_URL}/api/users`, async () => HttpResponse.json(await usersResponse)),
    );
    renderModal();

    expect(await screen.findByText("Cargando usuarios...")).toBeInTheDocument();

    resolveUsers(USERS);
    expect(await screen.findByRole("option", { name: /Bar Uno/ })).toBeInTheDocument();
  });

  it("shows the selected user (name + email) with a 'Cambiar' button after picking one", async () => {
    mockUsers();
    renderModal();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Buscar anunciante"), "teatro");
    expect(screen.queryByRole("option", { name: /Bar Uno/ })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("option", { name: /Teatro Dos/ }));

    const selected = screen.getByRole("group", { name: "Usuario seleccionado" });
    expect(selected).toHaveTextContent("Teatro Dos");
    expect(selected).toHaveTextContent("dos@x.com");
    // El buscador desaparece: no se puede confundir texto tipeado con selección.
    expect(screen.queryByLabelText("Buscar anunciante")).not.toBeInTheDocument();

    await user.click(within(selected).getByRole("button", { name: "Cambiar" }));
    expect(screen.getByLabelText("Buscar anunciante")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Buscar anunciante")).toHaveFocus());
  });

  it("fills 'Nombre del anunciante' from the chosen user, but keeps a custom name typed first", async () => {
    mockUsers();
    renderModal();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("option", { name: /Bar Uno/ }));
    expect(screen.getByLabelText("Nombre del anunciante")).toHaveValue("Bar Uno");

    // Cambiar de anunciante reemplaza el nombre autocompletado (no editado).
    await user.click(screen.getByRole("button", { name: "Cambiar" }));
    await user.click(await screen.findByRole("option", { name: /Teatro Dos/ }));
    expect(screen.getByLabelText("Nombre del anunciante")).toHaveValue("Teatro Dos");

    // Si el admin lo edita, ya no se pisa.
    await user.clear(screen.getByLabelText("Nombre del anunciante"));
    await user.type(screen.getByLabelText("Nombre del anunciante"), "Nombre custom");
    await user.click(screen.getByRole("button", { name: "Cambiar" }));
    await user.click(await screen.findByRole("option", { name: /Bar Uno/ }));
    expect(screen.getByLabelText("Nombre del anunciante")).toHaveValue("Nombre custom");
  });

  it("shows an empty-state message when there are no users to choose from", async () => {
    mockUsers([]);
    renderModal();

    expect(await screen.findByText("No se encontraron usuarios.")).toBeInTheDocument();
  });

  it("requests GET /api/users only once while typing in the search box", async () => {
    let calls = 0;
    server.use(
      http.get(`${API_URL}/api/users`, () => {
        calls += 1;
        return HttpResponse.json(USERS);
      }),
    );
    renderModal();
    const user = userEvent.setup();

    await screen.findByRole("option", { name: /Bar Uno/ });
    await user.type(screen.getByLabelText("Buscar anunciante"), "bar uno");
    expect(await screen.findByRole("option", { name: /Bar Uno/ })).toBeInTheDocument();
    expect(calls).toBe(1);
  });

  it("disables browser autocomplete on the search box and every text input", async () => {
    mockUsers();
    renderModal();

    expect(screen.getByLabelText("Buscar anunciante")).toHaveAttribute("autocomplete", "off");
    for (const label of ["Nombre del anunciante", "O pegá una URL ya hosteada", "Link de destino", "Texto alternativo"]) {
      expect(screen.getByLabelText(label)).toHaveAttribute("autocomplete", "off");
    }
  });
});

describe("AdItemFormModal — validación visible", () => {
  it("submitting without an advertiser shows the error, marks and focuses the field, and does NOT call the API", async () => {
    mockUsers();
    const onSave = renderModal();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("O pegá una URL ya hosteada"), "https://x.com/a.jpg");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.map((a) => a.textContent)).toEqual(
      expect.arrayContaining(["Elegí un anunciante", "Completá los campos marcados."]),
    );
    const search = screen.getByLabelText("Buscar anunciante");
    expect(search).toHaveAttribute("aria-invalid", "true");
    expect(search).toHaveAttribute("aria-describedby", "ad-error-user_id");
    expect(search).toHaveFocus();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("focuses the first invalid field in visual order (image before link)", async () => {
    mockUsers();
    const onSave = renderModal();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("option", { name: /Bar Uno/ }));
    await user.type(screen.getByLabelText("Link de destino"), "no-es-url");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Subí una imagen o pegá una URL")).toBeInTheDocument();
    expect(screen.getByText("URL inválida")).toBeInTheDocument();
    expect(screen.getByLabelText("Link de destino")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Imagen")).toHaveFocus();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls the API once an advertiser is chosen and the form is valid", async () => {
    mockUsers();
    const onSave = renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Completá los campos marcados.")).toBeInTheDocument();

    await user.click(await screen.findByRole("option", { name: /Bar Uno/ }));
    await user.type(screen.getByLabelText("O pegá una URL ya hosteada"), "https://x.com/a.jpg");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({ user_id: "u1", advertiser_name: "Bar Uno", img_url: "https://x.com/a.jpg" });
    expect(screen.queryByText("Completá los campos marcados.")).not.toBeInTheDocument();
  });

  it("edit mode shows the fixed advertiser (no picker) and saves without choosing one", async () => {
    mockUsers();
    const onSave = renderModal({ item: makeAdItemAdmin({ user_public_name: "Bar Uno" }) });
    const user = userEvent.setup();

    expect(screen.getByRole("dialog", { name: "Editar banner" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Buscar anunciante")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  });
});
