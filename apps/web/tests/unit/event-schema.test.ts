import { describe, expect, it } from "vitest";

import { eventFormSchema } from "@/features/events/schemas/event-schema";

// BUG 3 reportado: "La fecha y hora de fin debe ser posterior al inicio"
// tiene que salir del formulario (Zod, antes de enviar), no solo del
// backend. Esta suite documenta que la validación cruzada ya existe en
// eventFormSchema (ver también EventForm.test.tsx, que la cubre a nivel UI)
// y fija el contrato para que no se rompa sin darse cuenta.
const BASE = {
  title: "Evento de prueba",
  description: "",
  date: "2026-08-28",
  time: "20:00",
  time_end: "21:00",
  date_end: "2026-08-28",
  categories: ["musica"],
  city_id: "",
  location_mode: "preset" as const,
  location_id: "loc-1",
  location_name: "",
  location_address: "",
  ticket_type: "gratis" as const,
  price_at_door: "",
  price_advance: "",
  available_on_site: true,
  contact_instagram: "",
  contact_web: "",
  contact_email: "",
};

function issuesFor(overrides: Partial<typeof BASE>) {
  const result = eventFormSchema.safeParse({ ...BASE, ...overrides });
  return result.success ? [] : result.error.issues;
}

describe("eventFormSchema — validación cruzada date/time vs date_end/time_end", () => {
  it("mismo día, time_end posterior a time: válido", () => {
    expect(issuesFor({ time: "20:00", time_end: "22:00", date_end: "2026-08-28" })).toEqual([]);
  });

  it("mismo día, time_end igual a time: inválido (tiene que ser ESTRICTAMENTE posterior)", () => {
    const issues = issuesFor({ time: "20:00", time_end: "20:00", date_end: "2026-08-28" });
    expect(issues.some((i) => i.path.join(".") === "time_end")).toBe(true);
    expect(issues[0]?.message).toBe("La fecha y hora de fin debe ser posterior al inicio");
  });

  it("mismo día, time_end anterior a time: inválido (bug real reportado: 18:00 se dejaba guardar con inicio 21:00)", () => {
    const issues = issuesFor({ time: "21:00", time_end: "18:00", date_end: "2026-08-28" });
    expect(issues.some((i) => i.path.join(".") === "time_end")).toBe(true);
  });

  it("date_end anterior a date: inválido", () => {
    const issues = issuesFor({ date: "2026-08-28", date_end: "2026-08-27" });
    expect(issues.some((i) => i.path.join(".") === "date_end")).toBe(true);
  });

  it("date_end posterior a date: cualquier time_end es válido", () => {
    expect(issuesFor({ date: "2026-08-28", date_end: "2026-08-29", time: "20:00", time_end: "05:00" })).toEqual([]);
  });
});
