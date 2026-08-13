import { useContext } from "react";

import { ActiveCityContext, type ActiveCityContextValue } from "@/features/cities/context/ActiveCityContext";

/**
 * Ciudad activa del usuario (detectada por GPS o elegida a mano), compartida
 * por Navbar, Home y EventForm — ver `ActiveCityProvider` (envuelve toda la
 * app en `app/layout.tsx`).
 */
export function useActiveCity(): ActiveCityContextValue {
  const context = useContext(ActiveCityContext);
  if (!context) {
    throw new Error("useActiveCity debe usarse dentro de <ActiveCityProvider>");
  }
  return context;
}
