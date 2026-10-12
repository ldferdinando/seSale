import Link from "next/link";

import { cn } from "@/lib/utils";

interface LegalLinksProps {
  className?: string;
}

/**
 * Fila discreta "Términos · Privacidad". Google exige que la Política de
 * Privacidad esté linkeada desde el home para habilitar "Continuar con
 * Google" a cualquier usuario — no hay footer global, así que se usa en el
 * home, ¿Qué es seSALE?, login y registro.
 */
export function LegalLinks({ className }: LegalLinksProps) {
  return (
    <nav aria-label="Información legal" className={cn("flex justify-center gap-3 text-[11px] text-ink-4", className)}>
      <Link href="/terminos" className="underline-offset-2 hover:text-ink-2 hover:underline">
        Términos de Servicio
      </Link>
      <span aria-hidden>·</span>
      <Link href="/privacidad" className="underline-offset-2 hover:text-ink-2 hover:underline">
        Política de Privacidad
      </Link>
    </nav>
  );
}
