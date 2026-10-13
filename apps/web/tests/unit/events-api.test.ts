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

// Bug real de producción (ver a_revisar.md): desde la Etapa 10d el
// payload mandaba `date`/`date_end` corridos a la fecha UTC, así que un
// evento del sábado 17/10 a las 22:00 ART quedaba guardado como domingo
// 18/10. Contrato del backend: `date`/`date_end` = día de negocio ART (sin
// tocar), `time`/`time_end` = hora UTC.
describe("createEvent — conversión ART -> UTC (toUtcPayload)", () => {
  it("convierte solo las horas (+3h); las fechas viajan como día argentino", async () => {
    const payload = await capturePayload({ ...BASE_INPUT, time_end: "20:30" });
    expect(payload.date).toBe("2026-08-28");
    expect(payload.time).toBe("23:00");
    expect(payload.date_end).toBe("2026-08-28");
    expect(payload.time_end).toBe("23:30");
  });

  it("caso reportado: sábado 17/10 22:00 a 23:55 ART se manda como sábado, no domingo", async () => {
    const payload = await capturePayload({
      ...BASE_INPUT,
      date: "2026-10-17",
      time: "22:00",
      date_end: "2026-10-17",
      time_end: "23:55",
    });
    expect(payload.date).toBe("2026-10-17");
    expect(payload.time).toBe("01:00");
    expect(payload.date_end).toBe("2026-10-17");
    expect(payload.time_end).toBe("02:55");
  });

  it("20:00 a 22:00 ART: date_end no avanza aunque la hora UTC sea de madrugada", async () => {
    const payload = await capturePayload(BASE_INPUT);
    expect(payload.date_end).toBe("2026-08-28");
    expect(payload.time_end).toBe("01:00");
  });

  it("evento que cruza medianoche: date_end es el día argentino elegido", async () => {
    const payload = await capturePayload({
      ...BASE_INPUT,
      time: "23:00",
      date_end: "2026-08-29",
      time_end: "02:00",
    });
    expect(payload.date).toBe("2026-08-28");
    expect(payload.time).toBe("02:00");
    expect(payload.date_end).toBe("2026-08-29");
    expect(payload.time_end).toBe("05:00");
  });

  it("sin hora de fin: time_end viaja como null", async () => {
    const payload = await capturePayload({ ...BASE_INPUT, time_end: "" });
    expect(payload.time_end).toBeNull();
    expect(payload.date_end).toBe("2026-08-28");
  });
});
