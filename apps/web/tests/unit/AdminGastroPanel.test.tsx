import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { AdminGastroPanel } from "@/features/admin/components/AdminGastroPanel";
import { makeAdminGastroPlace } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminGastroPanel />
    </QueryClientProvider>,
  );
}

describe("AdminGastroPanel", () => {
  it("lists gastro places with plan badge and type badges", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/gastro`, () =>
        HttpResponse.json([makeAdminGastroPlace({ plan: "pro", gastro_types: ["bar", "cerveceria"] })]),
      ),
    );

    renderWithClient();

    expect(await screen.findByText("El Tinglado Bar")).toBeInTheDocument();
    const row = screen.getByTestId("admin-gastro-row");
    expect(within(row).getAllByText("Destacado Plus").length).toBeGreaterThanOrEqual(1);
    expect(within(row).getByText("Bares")).toBeInTheDocument();
    expect(within(row).getByText("Cervecerías")).toBeInTheDocument();
  });

  it("shows an inactive badge for is_active=false", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/gastro`, () => HttpResponse.json([makeAdminGastroPlace({ is_active: false })])),
    );

    renderWithClient();

    expect(await screen.findByText("Inactivo")).toBeInTheDocument();
  });
});
