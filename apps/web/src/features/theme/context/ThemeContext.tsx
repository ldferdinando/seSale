"use client";

import { createContext, useCallback, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "sesale_theme";

export interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    // localStorage puede lanzar en navegación privada — se sigue en "dark".
    return null;
  }
}

function persistTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Sin persistencia (ej. localStorage bloqueado) — el toggle sigue
    // funcionando en memoria durante la sesión.
  }
}

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Etapa "Cambios de diseño TIPO B v2.2" (punto 3 — modo claro/oscuro).
 * "dark" es el default (toda la app se diseñó en oscuro desde el inicio,
 * ver ARCHITECTURE.md) — se persiste en localStorage, mismo mecanismo que
 * `ActiveCityContext`/`city-detection.ts` (no hay convención de cookies
 * para preferencias puramente de UI del cliente en este proyecto).
 *
 * El tema se aplica con `data-theme="light"` en `document.body` — los
 * valores de la paleta alternativa viven en `globals.css`
 * (`body[data-theme="light"] { ... }`), tomados 1:1 de seSALE_v2.html.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = readStoredTheme();
    if (stored) setTheme(stored);
  }, []);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      persistTheme(next);
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}
