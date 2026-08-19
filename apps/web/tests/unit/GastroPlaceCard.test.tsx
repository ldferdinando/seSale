import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GastroPlaceCard } from "@/features/gastro/components/GastroPlaceCard";
import { makeGastroPlace } from "./mocks/handlers";

// 2026-08-17 es lunes en la fecha del sistema real, forzamos un martes
// (2026-08-18T15:00:00Z = martes 12:00 hora Argentina) para tener un
// resultado determinístico sin depender del reloj de la máquina.
const TUESDAY_ARGENTINA = new Date("2026-08-18T15:00:00Z");
const MONDAY_ARGENTINA = new Date("2026-08-17T15:00:00Z");

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

  it('shows "Hoy: cerrado" when today is null in opening_hours', () => {
    vi.setSystemTime(MONDAY_ARGENTINA);
    const place = makeGastroPlace(); // lunes: null

    render(<GastroPlaceCard place={place} />);

    expect(screen.getByText("Hoy: cerrado")).toBeInTheDocument();
  });

  it("does not show any hours line when opening_hours is null", () => {
    vi.setSystemTime(TUESDAY_ARGENTINA);
    const place = makeGastroPlace({ opening_hours: null });

    render(<GastroPlaceCard place={place} />);

    expect(screen.queryByText(/^Hoy:/)).not.toBeInTheDocument();
  });

  it('shows "Destacado Plus" badge for plan pro', () => {
    const place = makeGastroPlace({ plan: "pro" });

    render(<GastroPlaceCard place={place} />);

    expect(screen.getByText("Destacado Plus")).toBeInTheDocument();
  });

  it("shows no plan badge for plan gratis", () => {
    const place = makeGastroPlace({ plan: "gratis" });

    render(<GastroPlaceCard place={place} />);

    expect(screen.queryByText("Destacado Plus")).not.toBeInTheDocument();
    expect(screen.queryByText("Destacado")).not.toBeInTheDocument();
  });

  it("shows the verified icon when is_verified is true", () => {
    const place = makeGastroPlace({ is_verified: true });

    render(<GastroPlaceCard place={place} />);

    expect(screen.getByTestId("gastro-verified-icon")).toBeInTheDocument();
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
