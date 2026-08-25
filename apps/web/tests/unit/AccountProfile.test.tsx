import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { AccountProfile } from "@/features/users/components/AccountProfile";
import { makeUser } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient(user = makeUser()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AccountProfile currentUser={user} />
    </QueryClientProvider>,
  );
}

describe("AccountProfile", () => {
  it("Etapa 11a — BUG 5: editing full name (private field) saves via PUT /api/users/me", async () => {
    let calledWith: Record<string, unknown> | null = null;
    server.use(
      http.put(`${API_URL}/api/users/me`, async ({ request }) => {
        calledWith = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(makeUser({ full_name: calledWith.full_name as string }));
      }),
    );
    const user = userEvent.setup();
    renderWithClient(makeUser({ full_name: "Nombre Viejo" }));

    await user.click(screen.getByLabelText("Editar nombre real"));
    const input = screen.getByLabelText("Nombre real");
    await user.clear(input);
    await user.type(input, "Nombre Nuevo");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(calledWith?.full_name).toBe("Nombre Nuevo"));
  });

  it("Etapa 11a — BUG 5: editing phone (private field) saves via PUT /api/users/me", async () => {
    let calledWith: Record<string, unknown> | null = null;
    server.use(
      http.put(`${API_URL}/api/users/me`, async ({ request }) => {
        calledWith = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(makeUser({ phone: calledWith.phone as string }));
      }),
    );
    const user = userEvent.setup();
    renderWithClient(makeUser({ phone: null }));

    await user.click(screen.getByLabelText("Editar teléfono"));
    await user.type(screen.getByLabelText("Teléfono"), "+5492984000000");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(calledWith?.phone).toBe("+5492984000000"));
  });

  it("Etapa 11a — BUG 5: editing doc_type/doc_number together saves via PUT /api/users/me", async () => {
    let calledWith: Record<string, unknown> | null = null;
    server.use(
      http.put(`${API_URL}/api/users/me`, async ({ request }) => {
        calledWith = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          makeUser({ doc_type: calledWith.doc_type as "dni", doc_number: calledWith.doc_number as string }),
        );
      }),
    );
    const user = userEvent.setup();
    renderWithClient(makeUser({ doc_type: null, doc_number: null }));

    await user.click(screen.getByLabelText("Editar documento"));
    await user.click(screen.getByLabelText("Tipo de documento"));
    await user.click(await screen.findByRole("option", { name: "DNI" }));
    await user.type(screen.getByLabelText("Número de documento"), "30123456");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(calledWith?.doc_type).toBe("dni");
      expect(calledWith?.doc_number).toBe("30123456");
    });
  });

  it("does not show private fields as editable in the public section", async () => {
    renderWithClient();

    // email nunca es editable — ni siquiera aparece un lápiz de edición.
    expect(screen.queryByLabelText("Editar email")).not.toBeInTheDocument();
  });
});
