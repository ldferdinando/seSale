import type { Metadata } from "next";

import { QueEsSesaleContent } from "./QueEsSesaleContent";

// Etapa 11b — página informativa "¿Qué es seSALE?", link discreto en el
// Navbar al lado del CitySelector.
export const metadata: Metadata = {
  title: "¿Qué es seSALE? — Agenda cultural del Alto Valle",
  description:
    "seSALE es la agenda cultural del Alto Valle de la Patagonia. Encontrá eventos de música, teatro, ferias y más en General Roca, Cipolletti y la región.",
};

export default function QueEsSesalePage() {
  return <QueEsSesaleContent />;
}
