/**
 * jsdom no implementa `window.matchMedia` — lo necesitan los tests que
 * simulan viewport mobile/desktop para useIsDesktopViewport (Etapa
 * admin-responsive-1). Evalúa el query contra `window.innerWidth` en el
 * momento en que se llama, así alcanza con setear innerWidth antes de
 * renderizar.
 */
export function mockMatchMedia() {
  window.matchMedia = ((query: string) => {
    const minWidthMatch = /\(min-width:\s*(\d+)px\)/.exec(query);
    const minWidth = minWidthMatch ? Number(minWidthMatch[1]) : 0;
    return {
      matches: window.innerWidth >= minWidth,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  }) as typeof window.matchMedia;
}

export function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}
