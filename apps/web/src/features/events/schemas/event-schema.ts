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
    time_end: z.string().optional().or(z.literal("")),
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
  );

export type EventFormValues = z.infer<typeof eventFormSchema>;
