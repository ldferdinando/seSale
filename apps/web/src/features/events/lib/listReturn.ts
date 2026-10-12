/**
 * "Volver" desde el detalle de evento a la posición exacta del listado
 * (Home o /categorias/[key]).
 *
 * No alcanza con router.back(): los filtros de esas pantallas viven en
 * useState (se pierden al remontar) y los eventos se cargan client-side,
 * así que la restauración nativa de scroll corre antes de que exista el
 * contenido. Por eso el listado guarda un snapshot (ruta + scrollY + estado
 * de filtros) en sessionStorage al entrar a un evento, y lo restaura solo si
 * la navegación de vuelta viene del detalle:
 * - botón "Volver" (EventBackLink): marca explícita (markListReturning);
 * - atrás del navegador/gesto: el detalle "arma" la vuelta al montarse
 *   (armListReturn) y el listado la acepta solo si llegó por historial
 *   (lastNavigationWasTraverse). No se puede marcar desde un listener de
 *   popstate en el detalle: React 19 renderiza la transición del router de
 *   Next sincrónicamente dentro del popstate y el listado monta (y consulta)
 *   antes de que ese listener corra.
 */

const SNAPSHOT_KEY = "sesale:list-return";
const RETURNING_KEY = "sesale:list-returning";
const ARMED_KEY = "sesale:list-return-armed";

/** Subconjunto de la Navigation API que se usa (no está en lib.dom de TS 5). */
interface NavigationLike extends EventTarget {
  addEventListener(type: "navigate", listener: (event: Event & { navigationType?: string }) => void): void;
}

let lastNavigationWasTraverse = false;

if (typeof window !== "undefined") {
  const navigation = (window as Window & { navigation?: NavigationLike }).navigation;
  if (navigation) {
    // "navigate" se dispara al arrancar cada navegación (push/replace de
    // Next incluidos, y back/forward antes del popstate y del render).
    // "replace" no cuenta: Next hace replaceState justo después de un
    // traverse (sincroniza su estado en el history), y eso no es una
    // navegación nueva para el usuario.
    navigation.addEventListener("navigate", (event) => {
      if (event.navigationType === "traverse") lastNavigationWasTraverse = true;
      else if (event.navigationType !== "replace") lastNavigationWasTraverse = false;
    });
  } else {
    // Fallback sin Navigation API: puede llegar tarde (ver arriba); en ese
    // caso no se restaura y queda la restauración nativa del navegador. Sin
    // un evento de "push" para apagarlo, consumeListReturn lo resetea.
    window.addEventListener(
      "popstate",
      () => {
        lastNavigationWasTraverse = true;
      },
      true,
    );
  }
}

/** Solo para tests (jsdom no tiene Navigation API). */
export function setLastNavigationWasTraverseForTests(value: boolean): void {
  lastNavigationWasTraverse = value;
}

export interface ListReturnSnapshot<T> {
  path: string;
  scrollY: number;
  state: T;
}

/** sessionStorage puede tirar (modo privado, storage bloqueado): en ese
 * caso la feature simplemente no restaura. */
function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveListReturn<T>(path: string, scrollY: number, state: T): void {
  try {
    getStorage()?.setItem(SNAPSHOT_KEY, JSON.stringify({ path, scrollY, state }));
  } catch {
    // Storage lleno o bloqueado: no hay restauración, sin romper la navegación.
  }
}

export function readListReturn<T>(): ListReturnSnapshot<T> | null {
  try {
    const raw = getStorage()?.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ListReturnSnapshot<T>;
    if (typeof parsed.path !== "string" || typeof parsed.scrollY !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Marca que la próxima pantalla de listado que monte en `path` viene de
 * "volver" desde el detalle y tiene que restaurar su snapshot. */
export function markListReturning(path: string): void {
  try {
    getStorage()?.setItem(RETURNING_KEY, path);
  } catch {
    // idem saveListReturn
  }
}

/** El detalle de evento, al montarse, deja "armada" la vuelta a su listado
 * de origen: si después se vuelve por historial (atrás del navegador), el
 * listado restaura. */
export function armListReturn(path: string): void {
  try {
    getStorage()?.setItem(ARMED_KEY, path);
  } catch {
    // idem saveListReturn
  }
}

/** Devuelve el snapshot de `path` solo si hay una vuelta pendiente hacia
 * esa ruta (marca explícita del botón "Volver", o vuelta armada + llegada
 * por historial), y consume las marcas (una sola restauración por vuelta).
 * El snapshot en sí se conserva: se pisa en la próxima entrada a un evento. */
export function consumeListReturn<T>(path: string): ListReturnSnapshot<T> | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const returningTo = storage.getItem(RETURNING_KEY);
    const armedFor = storage.getItem(ARMED_KEY);
    storage.removeItem(RETURNING_KEY);
    storage.removeItem(ARMED_KEY);
    const isReturn = returningTo === path || (armedFor === path && lastNavigationWasTraverse);
    lastNavigationWasTraverse = false;
    if (!isReturn) return null;
    const snapshot = readListReturn<T>();
    return snapshot && snapshot.path === path ? snapshot : null;
  } catch {
    return null;
  }
}

const USER_SCROLL_EVENTS = ["wheel", "touchstart", "keydown"] as const;
/** Tiempo sin cambios de alto de la página para dar el scroll por asentado
 * (skeletons → eventos reales, banners que cargan después). */
const SETTLE_MS = 600;
const RESTORE_TIMEOUT_MS = 4000;

/**
 * Lleva la ventana a `targetY` cuando el contenido ya es lo bastante alto,
 * y la re-ajusta mientras el alto de la página siga cambiando. Se corta si
 * el usuario scrollea/toca/teclea (no pelear con él) o al timeout.
 * Devuelve una función para cancelar.
 */
export function restoreScrollPosition(targetY: number): () => void {
  let frame = 0;
  let stopped = false;
  const startedAt = Date.now();
  let lastHeight = -1;
  let stableSince = startedAt;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    USER_SCROLL_EVENTS.forEach((type) => window.removeEventListener(type, stop));
  };

  const scrollTo = (top: number) => window.scrollTo({ top, behavior: "instant" });

  const tick = () => {
    if (stopped) return;
    const now = Date.now();
    const height = document.documentElement.scrollHeight;
    if (height !== lastHeight) {
      lastHeight = height;
      stableSince = now;
    }
    const maxY = height - window.innerHeight;

    if (maxY >= targetY) {
      if (Math.abs(window.scrollY - targetY) > 1) scrollTo(targetY);
      if (now - stableSince >= SETTLE_MS) {
        stop();
        return;
      }
    }
    if (now - startedAt >= RESTORE_TIMEOUT_MS) {
      scrollTo(Math.min(targetY, Math.max(maxY, 0)));
      stop();
      return;
    }
    frame = requestAnimationFrame(tick);
  };

  USER_SCROLL_EVENTS.forEach((type) => window.addEventListener(type, stop, { passive: true }));
  frame = requestAnimationFrame(tick);
  return stop;
}
