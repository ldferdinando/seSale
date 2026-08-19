import { Crown, Star, Ticket, type LucideIcon } from "lucide-react";

import type { EventPlan } from "@/features/events/types";

/**
 * Etapa 9b — copia (ícono/label/descripción) de las tres opciones de
 * visibilidad que se eligen en el resumen (EventPlanChooser), no en el
 * formulario de carga. El precio real ya no vive acá — viene de
 * GET /api/plans (PlanPrice vigente), ver EventPlanChooser.tsx.
 */
export const EVENT_PLAN_COPY: Record<EventPlan, { label: string; icon: LucideIcon; desc: string; emoji: string }> = {
  gratis: { label: "Gratuito", icon: Ticket, emoji: "🆓", desc: "Tu evento aparece en la lista" },
  dest: {
    label: "Destacado",
    icon: Star,
    emoji: "⭐",
    desc: "Aparece antes que los gratuitos. Podés subir un flyer del evento",
  },
  pro: {
    label: "Destacado Plus",
    icon: Crown,
    emoji: "🌟",
    desc: "Máxima visibilidad + lightbox",
  },
};
