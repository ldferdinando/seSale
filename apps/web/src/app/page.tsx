import { HomeContent } from "@/app/HomeContent";

/**
 * Sin esto, Next pre-renderiza "/" como contenido estático en build time
 * (confirmado con `npm run build`: salía como "○ Static") y Vercel la sirve
 * cacheada hasta el próximo deploy — incluyendo la fecha de TodayBanner
 * (`new Date()`), que queda congelada con el día del build hasta que React
 * hidrata y la corrige en el cliente. Bug reportado: usuaria vio "jueves 15"
 * un viernes 16. force-dynamic obliga a renderizar el HTML inicial en cada
 * request, así el día siempre llega correcto incluso si la hidratación
 * tarda o falla. HomeContent es "use client" (filtros, mapa, etc.) y no
 * puede exportar `dynamic` desde un archivo con "use client" — por eso vive
 * en un server component separado.
 */
export const dynamic = "force-dynamic";

export default function HomePage() {
  return <HomeContent />;
}
