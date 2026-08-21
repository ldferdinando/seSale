import { z } from "zod";

import { EVENT_CATEGORIES, MAX_EVENT_CATEGORIES, MIN_EVENT_CATEGORIES } from "@/features/events/types";
import { argentinaTodayIso } from "@/lib/date-helpers";

const CATEGORY_VALUES = EVENT_CATEGORIES.map((c) => c.value) as [string, ...string[]];

// El día de hoy en Argentina, no en UTC — cerca de la medianoche argentina
// (21:00–23:59 ART) el día UTC ya cambió y usar new Date().toISOString()
// rechazaba fechas que en Argentina todavía eran válidas.
const todayIso = () => argentinaTodayIso();

export const eventFormSchema = z
  .object({
    title: z.string().min(1, "El título es obligatorio").max(255),
    description: z.string().max(2000).optional().or(z.literal("")),
    date: z.string().min(1, "La fecha es obligatoria").refine((value) => value >= todayIso(), {
      message: "La fecha no puede estar en el pasado",
    }),
    time: z.string().min(1, "La hora es obligatoria"),
    // Etapa 10a: obligatorio (antes era opcional). La coherencia con
    // `time`/`date`/`date_end` se valida en los `.refine` de más abajo —
    // acá solo se exige que venga cargado.
    time_end: z.string().min(1, "La hora de fin es requerida"),
    // Etapa 10b: fecha de fin — obligatoria, con default automático
    // (EventForm.tsx la completa sola cuando se elige la hora de inicio).
    date_end: z.string().min(1, "La fecha de fin es obligatoria"),
    categories: z
      .array(z.enum(CATEGORY_VALUES))
      .min(MIN_EVENT_CATEGORIES, "Elegí al menos una categoría")
      .max(MAX_EVENT_CATEGORIES, "Máximo 3 categorías"),
    city_id: z.string().optional().or(z.literal("")),
    // Etapa 7b — Tab "Elegir lugar" (preset) o "Indicar en el mapa" (map).
    location_mode: z.enum(["preset", "map"]).default("preset"),
    location_id: z.string().optional().or(z.literal("")),
    location_name: z.string().max(255).optional().or(z.literal("")),
    location_address: z.string().max(500).optional().or(z.literal("")),
    location_latitude: z.number().optional(),
    location_longitude: z.number().optional(),
    ticket_type: z.enum(["gratis", "pago", "anticipo"]),
    price_at_door: z.string().optional().or(z.literal("")),
    price_advance: z.string().optional().or(z.literal("")),
    available_on_site: z.boolean().optional(),
    contact_instagram: z.string().max(100).optional().or(z.literal("")),
    contact_web: z.string().max(255).optional().or(z.literal("")),
    contact_email: z.string().email("Email inválido").optional().or(z.literal("")),
  })
  .refine((data) => data.ticket_type === "gratis" || data.price_at_door || data.price_advance, {
    message: "Indicá al menos un precio si la entrada no es gratis",
    path: ["price_at_door"],
  })
  .refine((data) => data.location_mode !== "preset" || Boolean(data.location_id), {
    message: "Elegí un lugar de la lista",
    path: ["location_id"],
  })
  .refine((data) => data.location_mode !== "map" || Boolean(data.location_address), {
    message: "La dirección es obligatoria",
    path: ["location_address"],
  })
  .refine(
    (data) => data.location_mode !== "map" || (data.location_latitude != null && data.location_longitude != null),
    {
      message: "Marcá la ubicación en el mapa (clickeá o arrastrá el pin)",
      path: ["location_address"],
    },
  )
  // Etapa 10b — reemplaza la regla de la Etapa 10a (mínimo 15' si no
  // cruza medianoche, "cruza medianoche" inferido de time_end < time).
  // Ahora date_end es explícito: date_end >= date_start siempre, y si es
  // el mismo día, time_end tiene que ser ESTRICTAMENTE posterior a
  // time_start — no alcanza con que sean distintos, "18:00" también es
  // "distinto" de "21:00" pero es anterior (bug real reportado: dejaba
  // guardar esa combinación). Si date_end es un día posterior, cualquier
  // time_end es válido. Mismo criterio que _validate_event_span en el
  // backend (que sí comparaba datetimes completos y no tenía este bug).
  .refine((data) => !data.date || !data.date_end || data.date_end >= data.date, {
    message: "La fecha y hora de fin debe ser posterior al inicio",
    path: ["date_end"],
  })
  .refine(
    (data) => {
      if (!data.date || !data.date_end || !data.time || !data.time_end) return true;
      if (data.date_end === data.date) return data.time_end > data.time;
      return true; // date_end posterior a date: cualquier time_end es válido
    },
    {
      message: "La fecha y hora de fin debe ser posterior al inicio",
      path: ["time_end"],
    },
  );

export type EventFormValues = z.infer<typeof eventFormSchema>;
