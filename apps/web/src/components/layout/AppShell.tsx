"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Etapa "Cambios de diseño TIPO B v2.2" (punto 12 — layout centrado
 * desktop): en pantallas >=768px centra el contenido en una columna de
 * 560px con `bg-background` propio (el fondo detrás, `--surround`, se
 * aplica a `body` en globals.css) — calcado de `.screen` en
 * seSALE_v2.html. Navbar.tsx y BottomNav.tsx aplican la misma condición
 * para centrarse en el mismo ancho (son elementos `sticky`/`fixed`
 * independientes, no hijos de este contenedor).
 *
 * `/admin` queda excluido: el panel admin ya arma su propio layout de
 * tablas/paneles pensado para verse ancho en escritorio (`container
 * mx-auto max-w-2xl` por página) — forzarlo a 560px recortaría tablas
 * (ej. AdminUsersTable, AdminEventsPanel) que hoy dependen de ese ancho.
 * Ver a_revisar.md.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  return (
    <div className={cn("flex-1", !isAdmin && "md:mx-auto md:w-full md:max-w-[560px] md:bg-background")}>
      {children}
    </div>
  );
}
