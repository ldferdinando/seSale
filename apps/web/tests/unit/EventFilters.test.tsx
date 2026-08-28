import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EventFilters } from "@/features/events/components/EventFilters";
import type { EventFiltersState } from "@/features/events/types";

describe("EventFilters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 1)); // domingo 2026-03-01
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onChange with the search term when typing in the search box", () => {
    const onChange = vi.fn();
    render(<EventFilters filters={{}} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "jazz" } });

    expect(onChange).toHaveBeenCalledWith({ search: "jazz" });
  });

  it("calls onChange with tomorrow's date when clicking 'Mañana'", () => {
    const onChange = vi.fn();
    render(<EventFilters filters={{}} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /Mañana/ }));

    expect(onChange).toHaveBeenCalledWith({ dateFrom: "2026-03-02", dateTo: "2026-03-02" });
  });

  it("clears the date range when clicking 'Limpiar'", () => {
    const onChange = vi.fn();
    render(<EventFilters filters={{ dateFrom: "2026-03-01", dateTo: "2026-03-01" }} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));

    expect(onChange).toHaveBeenCalledWith({ dateFrom: undefined, dateTo: undefined });
  });

  it("opens the calendar and selects a day", () => {
    const onChange = vi.fn();
    render(<EventFilters filters={{}} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /Elegir fecha/ }));
    fireEvent.click(screen.getByRole("button", { name: "15" }));
    fireEvent.click(screen.getByRole("button", { name: /Ver eventos/ }));

    expect(onChange).toHaveBeenCalledWith({ dateFrom: "2026-03-15", dateTo: "2026-03-15" });
  });

  // Etapa 11b — Parte 3c
  it("does not show 'Limpiar filtros' with a single active filter", () => {
    render(<EventFilters filters={{ category: "musica" }} onChange={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument();
  });

  it("shows 'Limpiar filtros' with more than one active filter and resets category, date, moment and ticketType", () => {
    const onChange = vi.fn();
    render(
      <EventFilters
        filters={{ category: "musica", dateFrom: "2026-03-01", dateTo: "2026-03-01", moment: "nocturno", ticketType: "pago" }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(onChange).toHaveBeenCalledWith({
      category: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      moment: undefined,
      ticketType: undefined,
    });
  });

  // Etapa 12b — filtro de tipo de entrada
  it("passes ticketType='gratis' when clicking the 'Gratis' chip", () => {
    const onChange = vi.fn();
    render(<EventFilters filters={{}} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Gratis" }));

    expect(onChange).toHaveBeenCalledWith({ ticketType: "gratis" });
  });

  it("passes ticketType=undefined when clicking 'Todos'", () => {
    const onChange = vi.fn();
    render(<EventFilters filters={{ ticketType: "pago" }} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Todos" }));

    expect(onChange).toHaveBeenCalledWith({ ticketType: undefined });
  });

  it("marks the active ticket-type chip as pressed", () => {
    render(<EventFilters filters={{ ticketType: "pago" }} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Pago" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Gratis" })).toHaveAttribute("aria-pressed", "false");
  });

  it("counts ticketType as an active filter for 'Limpiar filtros'", () => {
    render(<EventFilters filters={{ category: "musica", ticketType: "gratis" }} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Limpiar filtros" })).toBeInTheDocument();
  });

  // Etapa 11b — Parte 3c: DateFilter guardaba el preset activo ("Este finde",
  // etc.) en estado local — si el padre limpiaba el filtro de fecha desde
  // afuera (ej. "Limpiar filtros"), el botón del preset seguía marcado como
  // activo aunque dateFrom/dateTo ya estuvieran vacíos.
  it("un-marks the active date preset when the parent clears the filter externally", () => {
    function Wrapper() {
      const [filters, setFilters] = useState<EventFiltersState>({});
      return (
        <>
          <EventFilters filters={filters} onChange={setFilters} />
          <button type="button" onClick={() => setFilters({})}>
            reset-externo
          </button>
        </>
      );
    }
    render(<Wrapper />);

    fireEvent.click(screen.getByRole("button", { name: /Este finde/ }));
    expect(screen.getByRole("button", { name: /Este finde/ })).toHaveClass("bg-primary");

    fireEvent.click(screen.getByRole("button", { name: "reset-externo" }));

    expect(screen.getByRole("button", { name: /Este finde/ })).not.toHaveClass("bg-primary");
  });
});
