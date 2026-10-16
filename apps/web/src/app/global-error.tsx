"use client";

import { useEffect } from "react";

import "./globals.css";
import { logClientError } from "@/lib/logClientError";

/**
 * Error boundary de la raíz: atrapa errores dentro del propio RootLayout
 * (navbar, providers) — un caso más grave que error.tsx, que solo cubre un
 * segmento. Next exige que reemplace <html>/<body> enteros, por eso importa
 * globals.css acá (RootLayout, que normalmente lo importa, no se renderiza
 * en este caso).
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    logClientError(error, "global-error-boundary");
  }, [error]);

  return (
    <html lang="es">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-16 text-center">
          <div className="flex max-w-md flex-col gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">seSALE</h1>
            <p className="text-sm text-ink-4">
              Tuvimos un problema para cargar el sitio. Probá recargando la página.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            Recargar
          </button>
        </main>
      </body>
    </html>
  );
}
