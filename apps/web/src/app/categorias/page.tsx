import type { Metadata } from "next";

import { CategoriasContent } from "./CategoriasContent";

// Etapa 13a — sección propia de Categorías (tab del bottom nav). Grilla de
// categorías activas en orden alfabético con conteo de eventos por ciudad.
export const metadata: Metadata = {
  title: "Categorías de eventos — seSALE",
  description:
    "Explorá eventos de música, teatro, fiestas, ferias y más en el Alto Valle de la Patagonia.",
};

export default function CategoriasPage() {
  return <CategoriasContent />;
}
