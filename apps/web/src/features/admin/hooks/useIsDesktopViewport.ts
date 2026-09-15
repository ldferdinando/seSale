import { useEffect, useState } from "react";

/**
 * Breakpoint mobile/desktop del admin — Etapa admin-responsive-1. Usa el
 * mismo corte `md:` (768px) que ya usa el resto del proyecto para distinguir
 * mobile de desktop (ver BottomNav.tsx, Navbar.tsx, AppShell.tsx).
 */
export const ADMIN_DESKTOP_QUERY = "(min-width: 768px)";

/**
 * true en desktop (>= 768px), false en mobile. jsdom (tests) no implementa
 * `window.matchMedia` — en ese caso devolvemos `true` (desktop) para no
 * romper los tests existentes, que no simulan viewport y esperan el
 * comportamiento de escritorio. Los tests que sí quieren simular mobile
 * mockean `window.matchMedia` antes de renderizar.
 */
export function useIsDesktopViewport(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
    return window.matchMedia(ADMIN_DESKTOP_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const mql = window.matchMedia(ADMIN_DESKTOP_QUERY);
    setIsDesktop(mql.matches);

    function handleChange(event: MediaQueryListEvent) {
      setIsDesktop(event.matches);
    }

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return isDesktop;
}
