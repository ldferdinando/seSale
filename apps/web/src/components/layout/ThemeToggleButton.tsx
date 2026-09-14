"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/hooks/useTheme";

/**
 * Botón sol/luna del Navbar — Etapa "Cambios de diseño TIPO B v2.2" (punto
 * 3). En seSALE_v2.html, `.theme-btn` queda hardcodeado en
 * `background:#1a1a1a;border:1px solid #2a2a2a` (no reacciona al tema) —
 * bug ya señalado por la auditoría del prototipo. Acá se corrige usando los
 * tokens (`bg-surface-2`/`border-border`) para que el botón sí cambie de
 * aspecto en modo claro, en vez de arrastrar ese hardcodeo.
 */
export function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      title={isLight ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-primary"
    >
      {isLight ? <Moon className="h-[15px] w-[15px]" aria-hidden /> : <Sun className="h-[15px] w-[15px]" aria-hidden />}
    </button>
  );
}
