import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EventFilters } from "@/features/events/components/EventFilters";

describe("EventFilters", () => {
  it("calls onChange with the new date when 'Desde' changes", () => {
    const onChange = vi.fn();

    render(<EventFilters filters={{}} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-03-01" } });

    expect(onChange).toHaveBeenCalledWith({ dateFrom: "2026-03-01" });
  });

  it("calls onChange with the new date when 'Hasta' changes", () => {
    const onChange = vi.fn();

    render(<EventFilters filters={{ dateFrom: "2026-03-01" }} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-03-10" } });

    expect(onChange).toHaveBeenCalledWith({ dateFrom: "2026-03-01", dateTo: "2026-03-10" });
  });
});
