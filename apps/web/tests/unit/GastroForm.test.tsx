import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GastroForm } from "@/features/admin/components/GastroForm";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <GastroForm onSaved={vi.fn()} onCancel={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe("GastroForm", () => {
  it("closing a day via its toggle disables its time inputs", async () => {
    const user = userEvent.setup();
    renderWithClient();

    const mondayToggle = screen.getByTestId("gastro-day-toggle-lunes");
    const mondayOpen = screen.getByTestId("gastro-day-open-lunes") as HTMLInputElement;
    const mondayClose = screen.getByTestId("gastro-day-close-lunes") as HTMLInputElement;

    // Por default todos los días arrancan cerrados (opening_hours vacío).
    expect(mondayOpen).toBeDisabled();
    expect(mondayClose).toBeDisabled();

    await user.click(mondayToggle);
    expect(mondayOpen).toBeEnabled();
    expect(mondayClose).toBeEnabled();

    await user.click(mondayToggle);
    expect(mondayOpen).toBeDisabled();
    expect(mondayClose).toBeDisabled();
  });

  it("limits gastro type selection to a maximum of 5", async () => {
    const user = userEvent.setup();
    renderWithClient();

    const checkboxes = [
      "Cervecerías",
      "Restaurantes",
      "Parrillas",
      "Bares",
      "Cafés",
      "Pizzerías",
    ].map((label) => screen.getByRole("checkbox", { name: label }));

    for (const checkbox of checkboxes.slice(0, 5)) {
      await user.click(checkbox);
    }
    expect(checkboxes[5]).toBeDisabled();
  });
});
