import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GastroPlaceCard } from "@/features/gastro/components/GastroPlaceCard";
import { makeGastroPlace } from "./mocks/handlers";

// 2026-08-17 es lunes en la fecha del sistema real, forzamos un martes
// (2026-08-18T15:00:00Z = martes 12:00 hora Argentina) para tener un
// resultado determinístico sin depender del reloj de la máquina.
const TUESDAY_ARGENTINA = new Date("2026-08-18T15:00:00Z");
const MONDAY_ARGENTINA = new Date("2026-08-17T15:00:00Z");
// 2026-08-19T00:00:00Z = martes 21:00 hora Argentina — dentro del horario
// 20:00 a 02:00 del fixture (`makeGastroPlace`).
const TUESDAY_NIGHT_ARGENTINA = new Date("2026-08-19T00:00:00Z");

describe("GastroPlaceCard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows today's hours computed in Argentina time", () => {
    vi.setSystemTime(TUESDAY_ARGENTINA);
    const place = makeGastroPlace();

    render(<GastroPlaceCard place={place} />);

    expect(screen.getByText("Hoy: 20:00 a 02:00 hs")).toBeInTheDocument();
  });

  // Etapa 10b-2: si el día está marcado como null (cerrado hoy), el chip no
  // se muestra — el silencio comunica "hoy no abre" sin ser agresivo.
  it("does not show any chip when today is null in opening_hours", () => {
    vi.setSystemTime(MONDAY_ARGENTINA);
    const place = makeGastroPlace(); // lunes: null

    render(<GastroPlaceCard place={place} />);

    expect(screen.queryByText(/^Hoy:/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("gastro-open-now")).not.toBeInTheDocument();
    expect(screen.queryByTestId("gastro-today-hours")).not.toBeInTheDocument();
  });

  it("does not show any hours line when opening_hours is null", () => {
    vi.setSystemTime(TUESDAY_ARGENTINA);
    const place = makeGastroPlace({ opening_hours: null });

    render(<GastroPlaceCard place={place} />);

    expect(screen.queryByText(/^Hoy:/)).not.toBeInTheDocument();
  });

  // Etapa 10b-2: chip "Abierto ahora" cuando la hora actual cae dentro del
  // rango de hoy (isOpenNow).
  it('shows "Abierto ahora" chip when isOpenNow is true', () => {
    vi.setSystemTime(TUESDAY_NIGHT_ARGENTINA);
    const place = makeGastroPlace();

    render(<GastroPlaceCard place={place} />);

    expect(screen.getByTestId("gastro-open-now")).toBeInTheDocument();
    expect(screen.getByText("Abierto ahora")).toBeInTheDocument();
    expect(screen.queryByTestId("gastro-today-hours")).not.toBeInTheDocument();
  });

  // Etapa 10b-1: seSALE.html elimina la etiqueta de texto de plan — se
  // distingue solo por fondo/borde/miniatura, nunca por texto.
  it("does not render any plan text badge, for any plan", () => {
    render(<GastroPlaceCard place={makeGastroPlace({ plan: "gratis" })} />);
    expect(screen.queryByText("Destacado")).not.toBeInTheDocument();
    expect(screen.queryByText("Destacado Plus")).not.toBeInTheDocument();

    render(<GastroPlaceCard place={makeGastroPlace({ plan: "pro" })} />);
    expect(screen.queryByText("Destacado Plus")).not.toBeInTheDocument();
  });

  it("plan='pro' with cover_img_url shows the thumbnail image", () => {
    const place = makeGastroPlace({ plan: "pro", cover_img_url: "/uploads/covers/1/cover.jpg" });

    const { container } = render(<GastroPlaceCard place={place} />);

    const card = screen.getByTestId("gastro-place-card");
    expect(card.className).toContain("border-l-[6px]");
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", expect.stringContaining("cover.jpg"));
  });

  it("plan='pro' without cover_img_url shows a placeholder icon", () => {
    const place = makeGastroPlace({ plan: "pro", cover_img_url: null });

    const { container } = render(<GastroPlaceCard place={place} />);

    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByTestId("gastro-place-card").className).toContain("border-l-[6px]");
  });

  // Etapa 10b-2: la foto de Destacado Plus es clickeable y abre el
  // ImageLightbox (ya existe desde la Etapa 8b) con la imagen completa.
  it("plan='pro' photo opens the ImageLightbox on click", () => {
    const place = makeGastroPlace({ plan: "pro", cover_img_url: "/uploads/covers/1/cover.jpg" });

    render(<GastroPlaceCard place={place} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("gastro-photo-button"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  // Etapa 10b-2: plan='dest' no lleva foto lateral (exclusiva de Plus).
  it("plan='dest' does not show a lateral photo, even with cover_img_url loaded", () => {
    const place = makeGastroPlace({ plan: "dest", cover_img_url: "/uploads/covers/1/cover.jpg" });

    const { container } = render(<GastroPlaceCard place={place} />);

    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.queryByTestId("gastro-photo-button")).not.toBeInTheDocument();
  });

  // Etapa 10b-2: plan='gratis' es una ficha compacta sin foto ni decoración
  // de plan (sin fondo degradé ni borde de acento).
  it("plan='gratis' shows no photo and no plan decoration", () => {
    const place = makeGastroPlace({ plan: "gratis", cover_img_url: "/uploads/covers/1/cover.jpg" });

    const { container } = render(<GastroPlaceCard place={place} />);

    expect(container.querySelector("img")).not.toBeInTheDocument();
    const card = screen.getByTestId("gastro-place-card");
    expect(card.className).not.toContain("border-l-[6px]");
    expect(card.className).not.toContain("#E91E8C77");
  });

  it("shows the verified icon when is_verified is true", () => {
    const place = makeGastroPlace({ is_verified: true });

    render(<GastroPlaceCard place={place} />);

    expect(screen.getByTestId("gastro-verified-icon")).toBeInTheDocument();
  });

  // Etapa 10b-1: botón "Llegar" (Google Maps) — siempre que haya
  // coordenadas o dirección (address es obligatorio en el modelo).
  it('shows a "Llegar" button that links to Google Maps by coordinates', () => {
    const place = makeGastroPlace({ latitude: -39.03, longitude: -67.58 });

    render(<GastroPlaceCard place={place} />);

    expect(screen.getByTestId("gastro-map-button")).toBeInTheDocument();
  });

  // Etapa 10b-1: CTA "Reservar" — solo Destacado Plus con WhatsApp cargado.
  it('shows a "Reservar" button only for plan pro with gastro_whatsapp', () => {
    const pro = makeGastroPlace({ plan: "pro", gastro_whatsapp: "5492984000001" });
    render(<GastroPlaceCard place={pro} />);
    expect(screen.getByTestId("gastro-reservar-button")).toBeInTheDocument();
  });

  it('does not show "Reservar" for plan dest', () => {
    const dest = makeGastroPlace({ plan: "dest", gastro_whatsapp: "5492984000001" });
    render(<GastroPlaceCard place={dest} />);
    expect(screen.queryByTestId("gastro-reservar-button")).not.toBeInTheDocument();
  });

  it('does not show "Reservar" for plan pro without gastro_whatsapp', () => {
    const pro = makeGastroPlace({ plan: "pro", gastro_whatsapp: null });
    render(<GastroPlaceCard place={pro} />);
    expect(screen.queryByTestId("gastro-reservar-button")).not.toBeInTheDocument();
  });

  // Etapa 9a — "Ver N evento(s)" navega al detalle del lugar (la card entera
  // ya es un Link a /lugares/{id}, ver a_revisar.md).
  it('shows "Ver N evento(s)" inside the link to /lugares/{id} when event_count > 0', () => {
    const place = makeGastroPlace({ event_count: 3 });

    render(<GastroPlaceCard place={place} />);

    const text = screen.getByText("Ver 3 eventos");
    expect(text.closest("a")).toHaveAttribute("href", `/lugares/${place.id}`);
  });

  it('shows singular "Ver 1 evento" when event_count is 1', () => {
    const place = makeGastroPlace({ event_count: 1 });

    render(<GastroPlaceCard place={place} />);

    expect(screen.getByText("Ver 1 evento")).toBeInTheDocument();
  });

  it("does not show any event count text when event_count is 0", () => {
    const place = makeGastroPlace({ event_count: 0 });

    render(<GastroPlaceCard place={place} />);

    expect(screen.queryByText(/evento/)).not.toBeInTheDocument();
  });
});
