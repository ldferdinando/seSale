"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Logo } from "@/components/Logo";
import { logClientError } from "@/lib/logClientError";

/**
 * Error boundary de ruta (App Router): atrapa errores de render dentro de
 * un segmento sin tirar abajo el resto del layout (navbar/bottom nav siguen
 * montados). No atrapa el crash nativo de Android System WebView (ocurre
 * antes de que React llegue a montar nada) ni errores fuera del árbol de
 * render — esos los cubre ClientErrorListener.tsx.
 */
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logClientError(error, "error-boundary");
  }, [error]);

  return (
    <main className="flex min-h-[calc(100vh-72px)] flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <Link href="/">
        <Logo size="lg" />
      </Link>

      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">Algo salió mal</h1>
        <p className="text-sm text-ink-4">
          Tuvimos un problema para mostrar esta página. Probá de nuevo o volvé al inicio.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="rounded-full border border-border px-5 py-2.5 text-sm font-bold text-foreground"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
