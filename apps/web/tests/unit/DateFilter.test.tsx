import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DateFilter } from "@/features/events/components/DateFilter";
import type { EventFiltersState } from "@/features/events/types";

function StatefulDateFilter({ onChange }: { onChange?: (f: EventFiltersState) => void }) {
  const [filters, setFilters] = useState<EventFiltersState>({});
  return (
    <DateFilter
      filters={filters}
      onChange={(next) => {
        setFilters(next);
        onChange?.(next);
      }}
    />
  );
}

function chip(name: string | RegExp) {
  return within(screen.getByRole("group", { name: "¿Cuándo?" })).getByRole("button", { name });
}

describe("DateFilter — chip 'Todos'", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 1)); // domingo 2026-03-01
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders 'Todos' as the first chip, selected by default", () => {
    render(<StatefulDateFilter />);

    const buttons = within(screen.getByRole("group", { name: "¿Cuándo?" })).getAllByRole("button");
    expect(buttons[0]).toHaveTextContent("Todos");
    expect(chip("Todos")).toHaveAttribute("aria-pressed", "true");
  });

  it("deselects 'Todos' when another option is picked", () => {
    render(<StatefulDateFilter />);

    fireEvent.click(chip(/Mañana/));

    expect(chip("Todos")).toHaveAttribute("aria-pressed", "false");
    expect(chip(/Mañana/)).toHaveAttribute("aria-pressed", "true");
  });

  it("going back to 'Todos' removes any date filter", () => {
    const onChange = vi.fn();
    render(<StatefulDateFilter onChange={onChange} />);

    fireEvent.click(chip(/Este finde/));
    fireEvent.click(chip("Todos"));

    expect(onChange).toHaveBeenLastCalledWith({ dateFrom: undefined, dateTo: undefined });
    expect(chip("Todos")).toHaveAttribute("aria-pressed", "true");
    expect(chip(/Este finde/)).toHaveAttribute("aria-pressed", "false");
  });

  it("'Todos' is not selected when a date range comes from outside (ej. TodayBanner)", () => {
    render(<DateFilter filters={{ dateFrom: "2026-03-01", dateTo: "2026-03-01" }} onChange={vi.fn()} />);

    expect(chip("Todos")).toHaveAttribute("aria-pressed", "false");
  });
});
