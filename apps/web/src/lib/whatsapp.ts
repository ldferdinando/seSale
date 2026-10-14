/**
 * Mensaje precargado de WhatsApp al contactar por un evento o un lugar
 * (organizador / Ficha de Lugar) — menciona seSALE para dar contexto a
 * quien recibe el mensaje. Centralizado para no duplicar el texto entre
 * EventDetailView.tsx y GastroDetailView.tsx.
 */
export type WhatsappContactSubject = "evento" | "lugar";

const CONTACT_MESSAGE: Record<WhatsappContactSubject, string> = {
  evento: "Hola! Vi tu evento en seSALE y quería hacerte una consulta.",
  lugar: "Hola! Vi este lugar en seSALE y quería hacer una consulta.",
};

export function buildWhatsappContactUrl(phoneDigits: string, subject: WhatsappContactSubject): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(CONTACT_MESSAGE[subject])}`;
}
