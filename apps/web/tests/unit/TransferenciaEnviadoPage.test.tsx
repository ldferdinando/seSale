import { render, screen } from "@testing-library/react";
import { useSearchParams } from "next/navigation";
import { describe, expect, it, vi } from "vitest";

import TransferenciaEnviadoPage from "@/app/planes/transferencia/enviado/page";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

describe("TransferenciaEnviadoPage", () => {
  it("muestra el mensaje de éxito y los botones de acción", () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams({ plan_name: "Destacado" }) as never);

    render(<TransferenciaEnviadoPage />);

    expect(screen.getByText("¡Comprobante enviado!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver mis eventos" })).toHaveAttribute("href", "/mi-cuenta");
    const whatsappLink = screen.getByRole("link", { name: "Contactar por WhatsApp" });
    expect(whatsappLink).toHaveAttribute("href", expect.stringContaining("wa.me"));
    expect(whatsappLink).toHaveAttribute("href", expect.stringContaining("Destacado"));
  });
});
