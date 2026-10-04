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
  it("renders the hero with the exact copy from seSALE.html", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "¿Qué es seSALE?" })).toBeInTheDocument();
    expect(screen.getByText("Agenda cultural digital")).toBeInTheDocument();
    const copy = screen.getByText(/Es GRATIS|Queremos que todos los eventos estén acá/).closest("p");
    expect(copy).toHaveTextContent(
      "seSale es la agenda cultural de tu ciudad. Es colaborativa, ¡así que corré la voz! Queremos que todos los eventos estén acá. Y es GRATIS. Todo lo que pasa, en un solo lugar — música en vivo, teatro, ferias, fiestas, eventos culturales en distintos espacios, propuestas infantiles, festivales y eventos deportivos, como competencias y torneos. Y también dónde comer o tomar algo antes o después.",
    );
    for (const [n, l] of [
      ["100%", "Local"],
      ["Gratis", "Para el público"],
      ["Real", "Verificado"],
    ]) {
      expect(screen.getByText(n)).toBeInTheDocument();
      expect(screen.getByText(l)).toBeInTheDocument();
    }
  });

  it("no longer renders the old Etapa 11b copy nor the 'Ver eventos' button", () => {
    renderPage();

    expect(screen.queryByText(/Alto Valle de la Patagonia/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Estamos en General Roca, Cipolletti/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ver eventos/ })).not.toBeInTheDocument();
  });

  it("renders the five 'Por qué seSALE' items with their exact copy", () => {
    renderPage();

    expect(screen.getByText("Es tuya, de tu ciudad")).toBeInTheDocument();
    expect(screen.getByText("Navegás sin registrarte")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Para ver eventos y lugares no hace falta crear una cuenta ni dejar tus datos. Solo se registra quien quiere publicar.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Eventos + lugares en un solo lugar")).toBeInTheDocument();
    expect(screen.getByText("Todo para planificar tu salida completa.")).toBeInTheDocument();
  });

  it("renders the six audience cards", () => {
    renderPage();

    for (const title of [
      "Bandas y artistas",
      "Bares y espacios",
      "Teatros",
      "Deportes",
      "Espacios culturales y fiestas populares",
      "El público",
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getByText("Difundí competencias, torneos y encuentros deportivos.")).toBeInTheDocument();
    expect(screen.getByText("Competencias")).toBeInTheDocument();
    expect(screen.getByText("Sumá tus muestras, festivales y fiestas de tu comunidad.")).toBeInTheDocument();
    expect(screen.getByText("Cultura")).toBeInTheDocument();
  });

  it("renders the organizers lead and the final disclaimer with the exact copy", () => {
    renderPage();

    expect(screen.getByText(/sin límite de cantidad y en diferentes categorías/).closest("p")).toHaveTextContent(
      "Publicar es siempre gratis: podés subir todos los eventos o lugares reales que tengas, sin límite de cantidad y en diferentes categorías siempre que sean adecuadas, esto se verifica. Si además querés más visibilidad, existen planes pagos opcionales para destacarte.",
    );
    expect(screen.getByText(/para delivery, clases/).closest("span")).toHaveTextContent(
      "seSALE no es para delivery, clases, servicios ni venta de productos. Solo eventos (culturales, infantiles, festivales y deportivos) y lugares donde salir.",
    );
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
