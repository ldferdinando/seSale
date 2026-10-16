/**
 * Reporta un error de runtime del cliente al backend (logs de Railway, ver
 * app/routers/client_errors.py — sin servicio de pago). Fire-and-forget: si
 * el propio reporte falla no hace nada visible al usuario, y `keepalive`
 * deja que el request termine aunque la página esté navegando/cerrándose.
 */
export function logClientError(
  error: { message: string; stack?: string | null },
  source: "error-boundary" | "global-error-boundary" | "window-onerror" | "unhandled-rejection",
): void {
  if (typeof window === "undefined") return;

  const payload = {
    message: error.message || "Error sin mensaje",
    stack: error.stack ?? undefined,
    url: window.location.href,
    user_agent: window.navigator.userAgent,
    source,
  };

  fetch("/api/client-errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Sin fallback: si el reporte de error falla, no hay nada más que hacer.
  });
}
