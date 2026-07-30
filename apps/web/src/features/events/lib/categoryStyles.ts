import {
  Baby,
  Disc3,
  Drama,
  Guitar,
  type LucideIcon,
  Mic2,
  Music2,
  Palette,
  PartyPopper,
  Store,
  Ticket,
  Trophy,
} from "lucide-react";

interface CategoryStyle {
  icon: LucideIcon;
  color: string;
}

// Colores e íconos calcados de los chips de categoría en seSALE.html.
export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  musica: { icon: Music2, color: "#7F77DD" },
  fiesta: { icon: PartyPopper, color: "#E91E8C" },
  teatro: { icon: Drama, color: "#EF9F27" },
  feria: { icon: Store, color: "#1D9E75" },
  dj: { icon: Disc3, color: "#378ADD" },
  milonga: { icon: Disc3, color: "#378ADD" },
  pena: { icon: Guitar, color: "#D85A30" },
  standup: { icon: Mic2, color: "#888888" },
  arte: { icon: Palette, color: "#7F77DD" },
  recital: { icon: Music2, color: "#7F77DD" },
  cine: { icon: Ticket, color: "#888888" },
  infantil: { icon: Baby, color: "#FF8FA3" },
  deportes: { icon: Trophy, color: "#14B8A6" },
};

export const DEFAULT_CATEGORY_STYLE: CategoryStyle = { icon: Ticket, color: "#888888" };
