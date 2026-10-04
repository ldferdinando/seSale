import { describe, expect, it } from "vitest";

import { sortEventsForAgenda } from "@/features/events/lib/sortEvents";
import type { EventPlan } from "@/features/events/types";

interface Row {
  id: string;
  date: string;
  time: string;
  plan: EventPlan;
}

const row = (id: string, date: string, time: string, plan: EventPlan): Row => ({ id, date, time, plan });

describe("sortEventsForAgenda", () => {
  it("orders by date ascending first, regardless of plan", () => {
    const sorted = sortEventsForAgenda([
      row("pro-late", "2026-10-06", "20:00:00", "pro"),
      row("free-early", "2026-10-05", "23:00:00", "gratis"),
    ]);

    expect(sorted.map((e) => e.id)).toEqual(["free-early", "pro-late"]);
  });

  it("within the same day orders by plan: Plus → Destacado → Gratis", () => {
    const sorted = sortEventsForAgenda([
      row("gratis", "2026-10-05", "18:00:00", "gratis"),
      row("dest", "2026-10-05", "22:00:00", "dest"),
      row("pro", "2026-10-05", "23:30:00", "pro"),
    ]);

    expect(sorted.map((e) => e.id)).toEqual(["pro", "dest", "gratis"]);
  });

  it("within the same day and plan orders by start time", () => {
    const sorted = sortEventsForAgenda([
      row("dest-22", "2026-10-05", "22:00:00", "dest"),
      row("dest-19", "2026-10-05", "19:00:00", "dest"),
      row("gratis-10", "2026-10-05", "10:00:00", "gratis"),
    ]);

    expect(sorted.map((e) => e.id)).toEqual(["dest-19", "dest-22", "gratis-10"]);
  });

  it("keeps the incoming order on full ties and does not mutate the input", () => {
    const input = [
      row("b", "2026-10-05", "20:00:00", "gratis"),
      row("a", "2026-10-05", "20:00:00", "gratis"),
      row("z", "2026-10-04", "20:00:00", "gratis"),
    ];
    const sorted = sortEventsForAgenda(input);

    expect(sorted.map((e) => e.id)).toEqual(["z", "b", "a"]);
    expect(input.map((e) => e.id)).toEqual(["b", "a", "z"]);
  });
});
