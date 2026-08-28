import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminGastroTypesPanel } from "@/features/admin/components/AdminGastroTypesPanel";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminGastroTypesPanel />
    </QueryClientProvider>,
  );
}

describe("AdminGastroTypesPanel", () => {
  it("shows the gastro type list", async () => {
    renderWithClient();

    expect(await screen.findByText("Bar")).toBeInTheDocument();
    expect(screen.getByText("bar")).toBeInTheDocument();
  });
});
