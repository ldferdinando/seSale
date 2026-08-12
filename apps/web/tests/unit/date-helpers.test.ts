import { describe, expect, it } from "vitest";

import { formatEventTime, toEventDateTimeISO } from "@/lib/date-helpers";

describe("formatEventTime", () => {
  it("convierte una hora UTC a formato 24hs en hora argentina", () => {
    expect(formatEventTime("2024-03-15T20:00:00Z")).toBe("17:00");
    expect(formatEventTime("2024-03-15T11:30:00Z")).toBe("08:30");
  });

  it("nunca muestra AM/PM", () => {
    expect(formatEventTime("2024-03-15T23:00:00Z")).not.toMatch(/am|pm/i);
  });

  it("caso borde: UTC 00:00 cae en las 21:00 del día anterior en Argentina", () => {
    expect(formatEventTime("2024-03-15T00:00:00Z")).toBe("21:00");
  });
});

describe("toEventDateTimeISO", () => {
  it("combina date y time (UTC) en un ISO datetime", () => {
    expect(toEventDateTimeISO("2024-03-15", "20:00:00")).toBe("2024-03-15T20:00:00Z");
  });
});
