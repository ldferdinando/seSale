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

  it("shows event and location reports with their type badge and correct link", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/reports`, () =>
        HttpResponse.json([
          makeAdminReport(),
          makeAdminReport({
            id: "88888888-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
            event_id: null,
            location_id: "33333333-3333-3333-3333-333333333333",
            target_title: "El Tinglado Bar",
            target_type: "location",
            text: "Este lugar cerró",
          }),
        ]),
      ),
    );
    renderWithClient();

    expect(await screen.findByText("Noche de Rock Nacional")).toBeInTheDocument();
    expect(screen.getByText("El Tinglado Bar")).toBeInTheDocument();

    const rows = screen.getAllByTestId("admin-report-row");
    expect(rows).toHaveLength(2);

    const badges = screen.getAllByTestId("admin-report-target-type");
    expect(badges.map((badge) => badge.textContent)).toEqual(["Evento", "Lugar"]);

    expect(screen.getByText("Noche de Rock Nacional").closest("a")).toHaveAttribute(
      "href",
      "/eventos/11111111-1111-1111-1111-111111111111",
    );
    expect(screen.getByText("El Tinglado Bar").closest("a")).toHaveAttribute(
      "href",
      "/lugares/33333333-3333-3333-3333-333333333333",
    );
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
