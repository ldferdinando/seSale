import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MisEventosPage from "@/app/mis-eventos/page";

async function renderPage(searchParams: { published?: string }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const page = await MisEventosPage({ searchParams: Promise.resolve(searchParams) });
  return render(<QueryClientProvider client={queryClient}>{page}</QueryClientProvider>);
}

describe("MisEventosPage", () => {
  it("no muestra el mensaje de confirmación sin el query param", async () => {
    await renderPage({});

    expect(screen.queryByText(/Evento publicado/i)).not.toBeInTheDocument();
  });

  it("muestra el mensaje de confirmación cuando viene ?published=1", async () => {
    await renderPage({ published: "1" });

    expect(screen.getByRole("status")).toHaveTextContent("Evento publicado");
  });
});
