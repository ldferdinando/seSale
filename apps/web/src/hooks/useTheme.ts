import { useContext } from "react";

import { ThemeContext, type ThemeContextValue } from "@/features/theme/context/ThemeContext";

/**
 * Tema claro/oscuro activo, persistido en localStorage — ver `ThemeProvider`
 * (envuelve toda la app en `app/layout.tsx`).
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  }
  return context;
}
