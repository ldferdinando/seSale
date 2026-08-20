import type { Metadata } from "next";

import { ProximamenteContent } from "./ProximamenteContent";

// Etapa 9d — página de modo mantenimiento (ver src/middleware.ts). No queremos
// que Google la indexe: es temporal, y no tiene contenido real para rankear.
export const metadata: Metadata = {
  title: "Próximamente — seSALE",
  description: "La agenda cultural del Alto Valle de la Patagonia. Próximamente.",
  robots: { index: false, follow: false },
};

export default function ProximamentePage() {
  return <ProximamenteContent />;
}
