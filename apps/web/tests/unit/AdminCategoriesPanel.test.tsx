import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { AdminCategoriesPanel } from "@/features/admin/components/AdminCategoriesPanel";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminCategoriesPanel />
    </QueryClientProvider>,
  );
}

describe("AdminCategoriesPanel", () => {
  it("shows the category list", async () => {
    renderWithClient();

    expect(await screen.findByText("Música en vivo")).toBeInTheDocument();
    expect(screen.getByText("musica")).toBeInTheDocument();
  });

  it("shows a 409 error message when toggling a category with future events", async () => {
    server.use(
      http.patch(`${API_URL}/api/admin/categories/:id/toggle`, () =>
        HttpResponse.json(
          { detail: "Esta categoría tiene 1 evento(s) futuro(s) activos. No se puede desactivar." },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithClient();

    const toggle = await screen.findByRole("switch", { name: "Desactivar categoría" });
    await user.click(toggle);

    expect(
      await screen.findByText("Esta categoría tiene 1 evento(s) futuro(s) activos. No se puede desactivar."),
    ).toBeInTheDocument();
  });
});
