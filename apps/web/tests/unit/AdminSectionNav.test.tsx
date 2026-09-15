import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AdminSectionNav } from "@/features/admin/components/AdminSectionNav";
import { mockMatchMedia, setViewportWidth } from "./mocks/matchMedia";

const SECTIONS = [
  { value: "eventos", label: "Eventos" },
  { value: "lugares", label: "Lugares" },
  { value: "usuarios", label: "Usuarios" },
];

describe("AdminSectionNav — Etapa admin-responsive-1", () => {
  it("abre el drawer de secciones, navega y lo cierra al elegir una sección", async () => {
    mockMatchMedia();
    setViewportWidth(375);
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<AdminSectionNav sections={SECTIONS} value="eventos" onChange={onChange} />);

    const openButton = screen.getByRole("button", { name: "Abrir menú de secciones" });
    expect(openButton).toHaveAttribute("aria-expanded", "false");

    await user.click(openButton);
    expect(openButton).toHaveAttribute("aria-expanded", "true");

    const dialog = await screen.findByRole("dialog", { name: "Secciones del panel" });
    const lugaresOption = within(dialog).getByRole("button", { name: "Lugares" });

    await user.click(lugaresOption);

    expect(onChange).toHaveBeenCalledWith("lugares");
    expect(screen.queryByRole("dialog", { name: "Secciones del panel" })).not.toBeInTheDocument();
  });

  it("cierra el drawer con Escape", async () => {
    mockMatchMedia();
    setViewportWidth(375);
    const user = userEvent.setup();

    render(<AdminSectionNav sections={SECTIONS} value="eventos" onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Abrir menú de secciones" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
