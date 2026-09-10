import { afterEach, describe, expect, it, vi } from "vitest";

const { notFoundMock } = vi.hoisted(() => ({ notFoundMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

import CategoriaDetallePage, { generateMetadata } from "@/app/categorias/[key]/page";

const CATALOG = [
  { id: "cat-musica", key: "musica", name: "Música en vivo", emoji: "🎵", color: "#7F77DD", sort_order: 1 },
];

function mockCatalogFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(CATALOG), { status: 200 })),
  );
}

afterEach(() => {
  notFoundMock.mockReset();
  vi.unstubAllGlobals();
});

describe("/categorias/[key] page", () => {
  it("calls notFound() for a key that is not an active category", async () => {
    mockCatalogFetch();

    await CategoriaDetallePage({ params: Promise.resolve({ key: "musica_inexistente" }) });

    expect(notFoundMock).toHaveBeenCalled();
  });

  it("does not call notFound() for a valid active category key", async () => {
    mockCatalogFetch();

    await CategoriaDetallePage({ params: Promise.resolve({ key: "musica" }) });

    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("generateMetadata uses the category name and the default city", async () => {
    mockCatalogFetch();

    const meta = await generateMetadata({ params: Promise.resolve({ key: "musica" }) });

    expect(meta.title).toBe("Música en vivo en General Roca — seSALE");
    expect(meta.description).toContain("Eventos de Música en vivo en General Roca");
  });

  it("generateMetadata falls back to a generic title for an unknown key", async () => {
    mockCatalogFetch();

    const meta = await generateMetadata({ params: Promise.resolve({ key: "nope" }) });

    expect(meta.title).toBe("Categoría — seSALE");
  });
});
