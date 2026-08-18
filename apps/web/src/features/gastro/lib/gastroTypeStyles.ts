import {
  Beer,
  Coffee,
  Flame,
  GlassWater,
  IceCreamCone,
  type LucideIcon,
  Martini,
  Pizza,
  Store,
  UtensilsCrossed,
  Wine,
} from "lucide-react";

interface GastroTypeStyle {
  icon: LucideIcon;
  color: string;
}

// Colores calcados de los chips de #s-lugares en seSALE.html (los 6 tipos
// que el diseño modela); los 4 tipos que GASTRO_TYPES agrega de más
// (heladeria, rotiseria, vinoteca, otro — ver a_revisar.md) usan colores
// coherentes con la misma paleta, sin referencia directa en el HTML.
export const GASTRO_TYPE_STYLES: Record<string, GastroTypeStyle> = {
  cerveceria: { icon: Beer, color: "#EF9F27" },
  restaurante: { icon: UtensilsCrossed, color: "#1D9E75" },
  parrilla: { icon: Flame, color: "#D85A30" },
  bar: { icon: GlassWater, color: "#7F77DD" },
  cafe: { icon: Coffee, color: "#EF9F27" },
  pizzeria: { icon: Pizza, color: "#E91E8C" },
  heladeria: { icon: IceCreamCone, color: "#378ADD" },
  rotiseria: { icon: Store, color: "#1D9E75" },
  vinoteca: { icon: Wine, color: "#7F77DD" },
  otro: { icon: Martini, color: "#888888" },
};

export const DEFAULT_GASTRO_TYPE_STYLE: GastroTypeStyle = { icon: Store, color: "#888888" };
