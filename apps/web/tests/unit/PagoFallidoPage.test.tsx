import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PagoFallidoPage from "@/app/planes/pago-fallido/page";

describe("PagoFallidoPage", () => {
  it("muestra el mensaje de error y un botón para reintentar", () => {
    render(<PagoFallidoPage />);

    expect(screen.getByText("El pago no pudo procesarse")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Intentar nuevamente/i })).toHaveAttribute("href", "/planes");
    expect(screen.getByRole("link", { name: /Contactar soporte/i })).toHaveAttribute(
      "href",
      expect.stringContaining("wa.me"),
    );
  });
});
