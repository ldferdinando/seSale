import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PasswordInput } from "@/components/ui/PasswordInput";

describe("PasswordInput", () => {
  it("arranca oculta (type=password) y el botón ojo alterna a texto visible y de vuelta", async () => {
    const user = userEvent.setup();
    render(<PasswordInput id="pw" aria-label="Contraseña" />);

    const input = screen.getByLabelText("Contraseña");
    expect(input).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(input).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("el botón ojo no envía el formulario (type=button)", () => {
    render(<PasswordInput id="pw" aria-label="Contraseña" />);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});
