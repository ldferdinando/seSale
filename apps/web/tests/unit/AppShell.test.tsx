import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(() => "/"),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

import { AppShell } from "@/components/layout/AppShell";

/**
 * Etapa "Cambios de diseño TIPO B v2.2" (punto 12 — layout centrado
 * desktop). `/admin` queda afuera de la columna de 560px — ver comentario
 * en AppShell.tsx y a_revisar.md.
 */
describe("AppShell", () => {
  it("centers the content on non-admin routes (md:max-w-[560px])", () => {
    usePathnameMock.mockReturnValue("/");
    render(
      <AppShell>
        <p data-testid="content">hola</p>
      </AppShell>,
    );

    const wrapper = screen.getByTestId("content").parentElement as HTMLElement;
    expect(wrapper.className).toContain("md:max-w-[560px]");
  });

  it("does not constrain the width on /admin routes", () => {
    usePathnameMock.mockReturnValue("/admin/eventos");
    render(
      <AppShell>
        <p data-testid="content">hola</p>
      </AppShell>,
    );

    const wrapper = screen.getByTestId("content").parentElement as HTMLElement;
    expect(wrapper.className).not.toContain("md:max-w-[560px]");
  });
});
