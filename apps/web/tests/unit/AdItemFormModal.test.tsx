import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

import { AdItemFormModal } from "@/features/ads/components/AdItemFormModal";
import { makeAdSlotAdmin } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderModal() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSave = vi.fn().mockResolvedValue({ id: "new-item" });
  render(
    <QueryClientProvider client={queryClient}>
      <AdItemFormModal slot={makeAdSlotAdmin()} onSave={onSave} isSaving={false} saveError={null} onCancel={() => {}} />
    </QueryClientProvider>,
  );
  return onSave;
}

describe("AdItemFormModal — selector de anunciante", () => {
  it(
    'shows "Cargando usuarios..." (not an empty popup) if the Select opens before GET /api/users resolves',
    async () => {
      // En vez de un delay fijo (que corre la carrera contra la velocidad de
      // la máquina y flaquea bajo carga en CI), controlamos manualmente
      // cuándo resuelve el request: así el estado de loading queda
      // garantizado en vez de depender del timing.
      let resolveUsers!: (users: unknown[]) => void;
      const usersResponse = new Promise<unknown[]>((resolve) => {
        resolveUsers = resolve;
      });
      server.use(
        http.get(`${API_URL}/api/users`, async () => {
          const users = await usersResponse;
          return HttpResponse.json(users);
        }),
      );
      renderModal();
      const user = userEvent.setup();

      // Simula al admin tipeando el nombre custom mientras la lista de
      // usuarios todavía viaja por red — la secuencia reportada como bug.
      await user.type(screen.getByLabelText("Nombre del anunciante"), "Nombre custom");
      await user.click(screen.getByRole("combobox", { name: "Anunciante" }));

      expect(await screen.findByText("Cargando usuarios...")).toBeInTheDocument();

      resolveUsers([
        { id: "u1", public_name: "Bar Uno", email: "uno@x.com", role: "user", is_active: true, full_name: "a", doc_type: null, doc_number: null, phone: null, phone_verified: false, email_verified: false, public_whatsapp: null, city_id: null, is_verified: false, created_at: "2024-01-01", created_by: null },
      ]);

      await waitFor(() => expect(screen.getByRole("option", { name: /Bar Uno/ })).toBeInTheDocument());
    },
  );

  it("can select a user even after typing the advertiser name first, once the list is loaded", async () => {
    server.use(
      http.get(`${API_URL}/api/users`, () =>
        HttpResponse.json([
          { id: "u1", public_name: "Bar Uno", email: "uno@x.com", role: "user", is_active: true, full_name: "a", doc_type: null, doc_number: null, phone: null, phone_verified: false, email_verified: false, public_whatsapp: null, city_id: null, is_verified: false, created_at: "2024-01-01", created_by: null },
        ]),
      ),
    );
    const onSave = renderModal();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Nombre del anunciante"), "Nombre custom");
    await user.click(screen.getByRole("combobox", { name: "Anunciante" }));
    await user.click(await screen.findByRole("option", { name: /Bar Uno/ }));

    expect(screen.getByRole("combobox", { name: "Anunciante" })).toHaveTextContent("Bar Uno");

    await user.type(screen.getByLabelText("O pegá una URL ya hosteada"), "https://x.com/a.jpg");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ user_id: "u1", advertiser_name: "Nombre custom" });
  });

  it("shows an empty-state message when there are no users to choose from", async () => {
    server.use(http.get(`${API_URL}/api/users`, () => HttpResponse.json([])));
    renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByRole("combobox", { name: "Anunciante" }));

    expect(await screen.findByText("No se encontraron usuarios.")).toBeInTheDocument();
  });
});
