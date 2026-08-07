import { Crown, Megaphone, Star, Ticket, type LucideIcon } from "lucide-react";

/**
 * Plan de PUBLICACIÓN elegido en el formulario ("¿con qué visibilidad
 * publicás tu evento?"). No confundir con `EventPlan` (types/index.ts), que
 * es el subconjunto que hoy acepta el backend (gratis/dest/pro) — "banner"
 * es un producto de ads aparte, ver a_revisar.md.
 */
export type PublishPlan = "gratis" | "dest" | "pro" | "banner";

export const PUBLISH_PLAN_OPTIONS: {
  value: PublishPlan;
  label: string;
  icon: LucideIcon;
  price: string;
  desc: string;
}[] = [
  { value: "gratis", label: "Gratuito", icon: Ticket, price: "$0", desc: "1 evento · básico · sin prioridad" },
  {
    value: "dest",
    label: "Destacado",
    icon: Star,
    price: "$X.XXX/mes",
    desc: "Ilimitado · fondo destacado · 2° prioridad",
  },
  {
    value: "pro",
    label: "Destacado Plus",
    icon: Crown,
    price: "$X.XXX/mes",
    desc: "Imagen · banner · stats · 1° prioridad",
  },
  {
    value: "banner",
    label: "Banner web",
    icon: Megaphone,
    price: "Consultar",
    desc: "Home + categorías · máxima visibilidad",
  },
];
