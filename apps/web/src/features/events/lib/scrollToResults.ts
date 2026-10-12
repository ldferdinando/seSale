import type { EventFiltersState } from "@/features/events/types";

/** Filtros "de chip" (fecha, momento, categoría, tipo de entrada). La
 * búsqueda de texto queda afuera a propósito: scrollear mientras se tipea
 * movería el input fuera de pantalla (y en mobile, fuera del teclado). */
const CHIP_FILTER_KEYS = ["category", "dateFrom", "dateTo", "moment", "ticketType"] as const;

/** Delay antes de scrollear: deja que React re-renderice con el filtro
 * aplicado (mismo criterio que el scroll de TodayBanner en Home). */
export const SCROLL_TO_RESULTS_DELAY_MS = 100;

/** Margen (px) bajo el cual se considera que el ancla de resultados ya
 * está en el borde superior (debajo del nav) o por encima — el usuario ya
 * está viendo los resultados y no hace falta mover la pantalla. */
const ALREADY_AT_RESULTS_PX = 16;
/** Aire entre el nav sticky y el inicio de los resultados. */
const GAP_BELOW_HEADER_PX = 8;

/** Alto del Navbar sticky (variable: en mobile con sesión ocupa ~190px). */
function stickyHeaderHeight(): number {
  return document.querySelector<HTMLElement>("[data-sticky-header]")?.getBoundingClientRect().height ?? 0;
}

export function chipFiltersChanged(prev: EventFiltersState, next: EventFiltersState): boolean {
  return CHIP_FILTER_KEYS.some((key) => prev[key] !== next[key]);
}

/** Scroll suave hasta el inicio de los resultados (o hasta la leyenda de
 * "Aún no se registran eventos", que vive en el mismo lugar). Recibe un
 * getter para leer el ref recién después del re-render. */
export function scrollToResults(getAnchor: () => HTMLElement | null): void {
  setTimeout(() => {
    const anchor = getAnchor();
    if (!anchor) return;
    const headerHeight = stickyHeaderHeight();
    if (anchor.getBoundingClientRect().top <= headerHeight + ALREADY_AT_RESULTS_PX) return;
    // scroll-margin-top dinámico: scrollIntoView deja el ancla justo debajo
    // del nav en vez de taparla.
    anchor.style.scrollMarginTop = `${headerHeight + GAP_BELOW_HEADER_PX}px`;
    anchor.scrollIntoView({ behavior: "smooth", block: "start" });
  }, SCROLL_TO_RESULTS_DELAY_MS);
}
