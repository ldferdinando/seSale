import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QueEsSesaleContent } from "@/app/que-es-sesale/QueEsSesaleContent";
import { ThemeProvider } from "@/features/theme/context/ThemeContext";

function renderPage() {
  return render(
    <ThemeProvider>
      <QueEsSesaleContent />
    </ThemeProvider>,
  );
}

// Etapa 11b — Parte 2
describe("QueEsSesaleContent", () => {
  it("renders the expected copy", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "¿Qué es seSALE?" })).toBeInTheDocument();
    expect(
      screen.getByText("seSALE es la agenda cultural del Alto Valle de la Patagonia."),
    ).toBeInTheDocument();
    expect(screen.getByText(/Estamos en General Roca, Cipolletti/)).toBeInTheDocument();
  });

  it("has a 'Ver eventos' button linking to the home", () => {
    renderPage();

    const link = screen.getByRole("link", { name: /Ver eventos/ });
    expect(link).toHaveAttribute("href", "/");
  });

  // Etapa "Ajustes de diseño reportados" (Parte 2, revisitada) — secciones
  // nuevas calcadas de #s-que-es en seSALE_v2.html, ausentes en la Etapa 11b.
  it("renders the 'Por qué seSALE' section", () => {
    renderPage();

    expect(screen.getByText("Por qué seSALE")).toBeInTheDocument();
    expect(screen.getByText("Cada organizador está verificado")).toBeInTheDocument();
  });

  it("renders the audience cards", () => {
    renderPage();

    expect(screen.getByText("¿Para quién es?")).toBeInTheDocument();
    expect(screen.getByText("Bandas y artistas")).toBeInTheDocument();
    expect(screen.getByText("El público")).toBeInTheDocument();
  });

  it("renders both 'Cómo funciona' step sequences", () => {
    renderPage();

    expect(screen.getByText("Cómo funciona — Para el público")).toBeInTheDocument();
    expect(screen.getByText("Cómo funciona — Para organizadores")).toBeInTheDocument();
    expect(screen.getAllByText("Paso 1")).toHaveLength(2);
    expect(screen.getByText("Creás tu cuenta gratis")).toBeInTheDocument();
  });
});
