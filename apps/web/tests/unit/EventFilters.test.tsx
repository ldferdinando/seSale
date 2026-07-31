import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EventFilters } from "@/features/events/components/EventFilters";

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
});
