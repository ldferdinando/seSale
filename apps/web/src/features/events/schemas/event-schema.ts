import { z } from "zod";

import { EVENT_CATEGORIES } from "@/features/events/types";

const CATEGORY_VALUES = EVENT_CATEGORIES.map((c) => c.value) as [string, ...string[]];

const todayIso = () => new Date().toISOString().slice(0, 10);

export const eventFormSchema = z
  .object({
    title: z.string().min(1, "El título es obligatorio").max(255),
    description: z.string().max(2000).optional().or(z.literal("")),
    date: z.string().min(1, "La fecha es obligatoria").refine((value) => value >= todayIso(), {
      message: "La fecha no puede estar en el pasado",
    }),
    time: z.string().min(1, "La hora es obligatoria"),
    category: z.enum(CATEGORY_VALUES, { message: "Elegí una categoría" }),
    location_name: z.string().min(1, "El lugar es obligatorio").max(255),
    location_address: z.string().min(1, "La dirección es obligatoria").max(500),
    ticket_type: z.enum(["gratis", "pago", "anticipo"]),
    price_at_door: z.string().optional().or(z.literal("")),
    price_advance: z.string().optional().or(z.literal("")),
    contact_instagram: z.string().max(100).optional().or(z.literal("")),
    contact_web: z.string().max(255).optional().or(z.literal("")),
    contact_email: z.string().email("Email inválido").optional().or(z.literal("")),
  })
  .refine((data) => data.ticket_type === "gratis" || data.price_at_door || data.price_advance, {
    message: "Indicá al menos un precio si la entrada no es gratis",
    path: ["price_at_door"],
  });

export type EventFormValues = z.infer<typeof eventFormSchema>;
