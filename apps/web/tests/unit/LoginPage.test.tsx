import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import LoginPage from "@/app/login/page";

async function renderPage(searchParams: { redirect?: string }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const page = await LoginPage({ searchParams: Promise.resolve(searchParams) });
  return render(<QueryClientProvider client={queryClient}>{page}</QueryClientProvider>);
}

describe("LoginPage (Etapa 9e)", () => {
  it("no muestra mensaje contextual sin ?redirect=", async () => {
    await renderPage({});

    expect(screen.queryByText(/Para publicar un evento necesitás una cuenta/i)).not.toBeInTheDocument();
  });

  it("muestra el mensaje de 'Para publicar' cuando ?redirect=/publicar", async () => {
    await renderPage({ redirect: "/publicar" });

    expect(screen.getByText(/Para publicar un evento necesitás una cuenta/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Registrate gratis/i })).toHaveAttribute("href", "/registro");
  });

  it("no muestra el mensaje contextual para otras rutas protegidas (ej. /mis-eventos)", async () => {
    await renderPage({ redirect: "/mis-eventos" });

    expect(screen.queryByText(/Para publicar un evento necesitás una cuenta/i)).not.toBeInTheDocument();
  });

  it("ignora un ?redirect= absoluto/externo (open redirect)", async () => {
    await renderPage({ redirect: "https://evil.example.com" });

    expect(screen.queryByText(/Para publicar un evento necesitás una cuenta/i)).not.toBeInTheDocument();
  });
});
