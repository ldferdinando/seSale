"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { armListReturn, markListReturning, readListReturn } from "@/features/events/lib/listReturn";

/**
 * "Volver" del detalle de evento. Antes era un <Link href="/"> fijo: llevaba
 * siempre al inicio de Home, aunque se viniera de una categoría.
 *
 * Si se llegó desde un listado (Home o /categorias/[key]) vuelve a esa ruta
 * y marca la vuelta para que el listado restaure filtros + scroll (ver
 * lib/listReturn.ts). Se navega con push y no con router.back(): el
 * historial puede tener otra cosa antes (p. ej. /editar). Sin listado de
 * origen (link directo/compartido), vuelve a Home como antes.
 *
 * También cubre el "atrás" del navegador/gesto: al montar, arma la vuelta
 * (armListReturn) y el listado la acepta si llega por historial.
 */
export function EventBackLink() {
  const [returnPath, setReturnPath] = useState<string | null>(null);

  useEffect(() => {
    const path = readListReturn()?.path ?? null;
    setReturnPath(path);
    if (path !== null) armListReturn(path);
  }, []);

  return (
    <Link
      href={returnPath ?? "/"}
      scroll={returnPath === null}
      onClick={(e) => {
        // Abrir en otra pestaña no es una "vuelta": no dejar la marca colgada.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        if (returnPath !== null) markListReturning(returnPath);
      }}
      className="flex items-center gap-3 border-b border-border pb-3 text-ink-3"
    >
      <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
      <span className="text-sm font-medium">Volver</span>
    </Link>
  );
}
