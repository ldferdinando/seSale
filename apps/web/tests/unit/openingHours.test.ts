import { describe, expect, it } from "vitest";

import { isOpenNow } from "@/features/gastro/lib/openingHours";
import type { OpeningHours } from "@/features/gastro/types";

// 2026-08-18 es martes / 2026-08-17 es lunes en hora Argentina (UTC-3) —
// mismas referencias que GastroPlaceCard.test.tsx, para consistencia.
const TUESDAY_ARGENTINA_12H = new Date("2026-08-18T15:00:00Z"); // 12:00 hora Argentina
const TUESDAY_ARGENTINA_21H = new Date("2026-08-19T00:00:00Z"); // 21:00 hora Argentina (mismo martes)
const TUESDAY_ARGENTINA_23_30 = new Date("2026-08-19T02:30:00Z"); // 23:30 hora Argentina (mismo martes)
const MONDAY_ARGENTINA_18H = new Date("2026-08-17T21:00:00Z"); // 18:00 hora Argentina

function opening(overrides: Partial<OpeningHours> = {}): OpeningHours {
  return {
    lunes: null,
    martes: { open: "09:00", close: "22:00" },
    miercoles: null,
    jueves: null,
    viernes: null,
    sabado: null,
    domingo: null,
    ...overrides,
  };
}

describe("isOpenNow", () => {
  it("returns true when the current time is within today's range", () => {
    // martes 12:00, horario 09:00 a 22:00
    expect(isOpenNow(opening(), TUESDAY_ARGENTINA_12H)).toBe(true);
  });

  it("returns false when the current time is outside today's range", () => {
    // martes 21:00 hora Argentina, horario cierra 20:00
    const hours = opening({ martes: { open: "09:00", close: "20:00" } });
    expect(isOpenNow(hours, TUESDAY_ARGENTINA_21H)).toBe(false);
  });

  it("returns true for an overnight range (close < open), after the opening time", () => {
    // martes 21:00, horario 20:00 a 02:00 (cruza medianoche) — ya abrió
    const hours = opening({ martes: { open: "20:00", close: "02:00" } });
    expect(isOpenNow(hours, TUESDAY_ARGENTINA_21H)).toBe(true);
  });

  it("returns true for an overnight range (close < open), before the closing time", () => {
    // martes 23:30, horario 20:00 a 02:00 (cruza medianoche) — todavía no cerró
    const hours = opening({ martes: { open: "20:00", close: "02:00" } });
    expect(isOpenNow(hours, TUESDAY_ARGENTINA_23_30)).toBe(true);
  });

  it("returns false when today is marked as closed (null)", () => {
    // lunes: null en el fixture default
    expect(isOpenNow(opening(), MONDAY_ARGENTINA_18H)).toBe(false);
  });

  it("returns false when opening_hours is null", () => {
    expect(isOpenNow(null, TUESDAY_ARGENTINA_12H)).toBe(false);
  });
});
