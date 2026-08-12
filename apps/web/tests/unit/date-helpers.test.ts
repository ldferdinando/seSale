import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { argentinaTodayIso, formatEventTime, localTimeToUtc, toEventDateTimeISO, utcTimeToLocal } from "@/lib/date-helpers";

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

describe("localTimeToUtc", () => {
  it("convierte una hora argentina a UTC (+3hs)", () => {
    expect(localTimeToUtc("2024-03-15", "17:00")).toBe("20:00");
    expect(localTimeToUtc("2024-03-15", "08:30")).toBe("11:30");
  });

  it("caso borde: 22:00 ART cruza a la madrugada UTC", () => {
    expect(localTimeToUtc("2024-03-15", "22:00")).toBe("01:00");
  });
});

describe("utcTimeToLocal", () => {
  it("es la inversa de localTimeToUtc", () => {
    expect(utcTimeToLocal("2024-03-15", "20:00")).toBe("17:00");
    expect(utcTimeToLocal("2024-03-15", "01:00")).toBe("22:00");
  });
});

describe("argentinaTodayIso", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("no se adelanta un día cuando en Argentina todavía es 'hoy' pero en UTC ya es 'mañana'", () => {
    // 23:30 ART del 15/03 == 02:30 UTC del 16/03.
    vi.setSystemTime(new Date("2024-03-16T02:30:00Z"));
    expect(argentinaTodayIso()).toBe("2024-03-15");
  });

  it("coincide con la fecha UTC durante el día", () => {
    vi.setSystemTime(new Date("2024-03-15T15:00:00Z"));
    expect(argentinaTodayIso()).toBe("2024-03-15");
  });
});
