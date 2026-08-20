import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProximamenteContent } from "@/app/proximamente/ProximamenteContent";

describe("ProximamenteContent (Etapa 9d)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("renderiza sin errores con el título, subtítulo y CTA de WhatsApp", () => {
    render(<ProximamenteContent />);

    expect(screen.getByText("Estamos preparando algo increíble")).toBeInTheDocument();
    expect(screen.getByText(/La agenda cultural del Alto Valle llega pronto/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Avisame cuando esté lista/i })).toHaveAttribute(
      "href",
      expect.stringContaining("wa.me"),
    );
  });

  it("tiene un link a /login", () => {
    render(<ProximamenteContent />);

    expect(screen.getByRole("link", { name: /Acceso staff/i })).toHaveAttribute("href", "/login");
  });

  it("no muestra countdown si NEXT_PUBLIC_LAUNCH_DATE está vacío", () => {
    vi.stubEnv("NEXT_PUBLIC_LAUNCH_DATE", "");

    render(<ProximamenteContent />);

    expect(screen.queryByTestId("proximamente-countdown")).not.toBeInTheDocument();
  });

  it("muestra countdown si NEXT_PUBLIC_LAUNCH_DATE tiene un valor futuro", async () => {
    vi.stubEnv("NEXT_PUBLIC_LAUNCH_DATE", "2999-01-01T00:00:00-03:00");

    render(<ProximamenteContent />);

    expect(await screen.findByTestId("proximamente-countdown")).toBeInTheDocument();
  });
});
