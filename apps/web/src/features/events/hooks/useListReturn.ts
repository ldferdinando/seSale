import { useCallback, useEffect, useRef } from "react";

import {
  consumeListReturn,
  restoreScrollPosition,
  saveListReturn,
  type ListReturnSnapshot,
} from "@/features/events/lib/listReturn";

/** Links al detalle de evento (EventCard). Excluye /eventos/{id}/editar,
 * que no tiene "Volver" al listado. */
function isEventDetailLink(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const anchor = target.closest("a[href]");
  const href = anchor?.getAttribute("href") ?? "";
  return /^\/eventos\/[^/?#]+$/.test(href);
}

/**
 * Listados con "volver a la misma posición" (Home, /categorias/[key]) — ver
 * lib/listReturn.ts.
 *
 * - Guarda ruta + scrollY + `state` al tocar un link a un evento (listener
 *   en captura sobre document, así cubre cualquier EventCard de la página).
 *   Devuelve `saveForNavigation` para navegaciones programáticas (pin del
 *   mapa en Home).
 * - Al montar, si se vuelve desde el detalle, llama a `onRestore(state)` y
 *   restaura el scroll cuando el contenido ya cargó.
 *
 * La ruta sale de window.location (no de usePathname) para no depender del
 * router en los tests que mockean next/navigation.
 */
export function useListReturn<T>(state: T, onRestore: (state: T) => void): () => void {
  const stateRef = useRef(state);
  stateRef.current = state;
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  const saveForNavigation = useCallback(() => {
    saveListReturn(window.location.pathname, window.scrollY, stateRef.current);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (isEventDetailLink(e.target)) saveForNavigation();
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [saveForNavigation]);

  // undefined = todavía no se consultó; null = no hay nada que restaurar.
  // Los refs sobreviven al doble montaje de StrictMode (dev): la marca se
  // consume una sola vez y el scroll se re-lanza en el segundo montaje.
  const snapshotRef = useRef<ListReturnSnapshot<T> | null | undefined>(undefined);
  const appliedRef = useRef(false);

  useEffect(() => {
    if (snapshotRef.current === undefined) {
      snapshotRef.current = consumeListReturn<T>(window.location.pathname);
    }
    const snapshot = snapshotRef.current;
    if (!snapshot) return;
    if (!appliedRef.current) {
      appliedRef.current = true;
      onRestoreRef.current(snapshot.state);
    }
    return restoreScrollPosition(snapshot.scrollY);
  }, []);

  return saveForNavigation;
}
