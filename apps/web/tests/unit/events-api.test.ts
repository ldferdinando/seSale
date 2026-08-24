import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { createEvent } from "@/features/events/services/events-api";
import type { EventCreateInput } from "@/features/events/types";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

const BASE_INPUT: EventCreateInput = {
  title: "Evento de prueba",
  date: "2026-08-28",
  time: "20:00",
  time_end: "22:00",
  date_end: "2026-08-28",
  categories: ["musica"],
  ticket_type: "gratis",
};

async function capturePayload(input: EventCreateInput): Promise<Record<string, unknown>> {
  let captured: Record<string, unknown> | undefined;
  server.use(
    http.post(`${API_URL}/api/events`, async ({ request }) => {
      captured = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ id: "evt-1" });
    }),
  );
  await createEvent(input);
  if (!captured) throw new Error("no se capturó el payload");
  return captured;
}

// Bug real reportado (Etapa 10d): 28/08 20:00 a 22:00 ART mandaba
// time_end="01:00" con date_end="2026-08-28" sin ajustar, que combinados
// en el backend dan un instante ANTERIOR al inicio del evento.
describe("createEvent — conversión ART -> UTC (toUtcPayload)", () => {
  it("no cruza medianoche: date/date_end quedan igual, solo cambia la hora (+3h)", async () => {
    const payload = await capturePayload({ ...BASE_INPUT, time_end: "20:30" });
    expect(payload.date).toBe("2026-08-28");
    expect(payload.time).toBe("23:00");
    expect(payload.date_end).toBe("2026-08-28");
    expect(payload.time_end).toBe("23:30");
  });

  it("caso reportado (bug real): 20:00 a 22:00 ART el 28/08 -> date_end avanza al 29/08", async () => {
    const payload = await capturePayload(BASE_INPUT);
    expect(payload.date).toBe("2026-08-28");
    expect(payload.time).toBe("23:00");
    expect(payload.date_end).toBe("2026-08-29");
    expect(payload.time_end).toBe("01:00");
  });

  it("time_end ART >= 21:00 cruza medianoche UTC: date_end avanza un día", async () => {
    const payload = await capturePayload({ ...BASE_INPUT, time_end: "22:30" });
    expect(payload.date_end).toBe("2026-08-29");
    expect(payload.time_end).toBe("01:30");
  });

  it("time (inicio) ART >= 21:00 también cruza medianoche UTC: date avanza un día", async () => {
    const payload = await capturePayload({
      ...BASE_INPUT,
      time: "22:00",
      time_end: "23:30",
    });
    expect(payload.date).toBe("2026-08-29");
    expect(payload.time).toBe("01:00");
    expect(payload.date_end).toBe("2026-08-29");
    expect(payload.time_end).toBe("02:30");
  });

  it("evento de varios días: date_end distinto de date se respeta como referencia de time_end", async () => {
    const payload = await capturePayload({
      ...BASE_INPUT,
      date: "2026-08-28",
      time: "20:00",
      date_end: "2026-08-30",
      time_end: "22:00",
    });
    expect(payload.date).toBe("2026-08-28");
    expect(payload.time).toBe("23:00");
    expect(payload.date_end).toBe("2026-08-31");
    expect(payload.time_end).toBe("01:00");
  });
});
