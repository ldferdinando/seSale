import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { AdminReportsPanel } from "@/features/admin/components/AdminReportsPanel";
import { makeAdminReport } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminReportsPanel />
    </QueryClientProvider>,
  );
}

describe("AdminReportsPanel", () => {
  it("lists reports with event title, text, phone and status badge", async () => {
    renderWithClient();

    expect(await screen.findByText("Noche de Rock Nacional")).toBeInTheDocument();
    expect(screen.getByText("Este evento tiene información incorrecta")).toBeInTheDocument();
    expect(screen.getByText("Tel: 2984123456")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });

  it("marks a report as reviewed", async () => {
    let status: "pending" | "reviewed" = "pending";
    server.use(
      http.get(`${API_URL}/api/admin/reports`, () => HttpResponse.json([makeAdminReport({ status })])),
      http.patch(`${API_URL}/api/admin/reports/:id/status`, async ({ request }) => {
        const body = (await request.json()) as { status: "reviewed" | "dismissed" };
        status = body.status as "pending" | "reviewed";
        return HttpResponse.json(makeAdminReport({ status }));
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    await screen.findByText("Noche de Rock Nacional");
    await user.click(screen.getByRole("button", { name: "Marcar revisado" }));

    await waitFor(() => expect(screen.getByText("Revisado")).toBeInTheDocument());
  });
});
