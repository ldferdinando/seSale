import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QueEsSesaleContent } from "@/app/que-es-sesale/QueEsSesaleContent";

// Etapa 11b — Parte 2
describe("QueEsSesaleContent", () => {
  it("renders the expected copy", () => {
    render(<QueEsSesaleContent />);

    expect(screen.getByRole("heading", { name: "¿Qué es seSALE?" })).toBeInTheDocument();
    expect(
      screen.getByText("seSALE es la agenda cultural del Alto Valle de la Patagonia."),
    ).toBeInTheDocument();
    expect(screen.getByText(/Estamos en General Roca, Cipolletti/)).toBeInTheDocument();
  });

  it("has a 'Ver eventos' button linking to the home", () => {
    render(<QueEsSesaleContent />);

    const link = screen.getByRole("link", { name: /Ver eventos/ });
    expect(link).toHaveAttribute("href", "/");
  });
});
