import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ResetContrasenaPage from "@/app/reset-contrasena/page";

async function renderPage(searchParams: { token?: string }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const page = await ResetContrasenaPage({ searchParams: Promise.resolve(searchParams) });
  return render(<QueryClientProvider client={queryClient}>{page}</QueryClientProvider>);
}

describe("ResetContrasenaPage", () => {
  it("shows the reset form when ?token= is present", async () => {
    await renderPage({ token: "abc123" });

    expect(screen.getByLabelText("Nueva contraseña")).toBeInTheDocument();
  });

  it("does not show the form and points to /recuperar-contrasena when there is no ?token=", async () => {
    await renderPage({});

    expect(screen.queryByLabelText("Nueva contraseña")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /recuperar contraseña/i })).toHaveAttribute(
      "href",
      "/recuperar-contrasena",
    );
  });
});
