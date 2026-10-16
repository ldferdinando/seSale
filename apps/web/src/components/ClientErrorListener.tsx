"use client";

import { useEffect } from "react";

import { logClientError } from "@/lib/logClientError";

/**
 * Captura errores de runtime que NO llegan a error.tsx (los error boundary
 * de React solo atrapan errores de render, no errores de event handlers ni
 * de promesas rechazadas sin catch) — así quedan visibles en los logs del
 * backend en vez de pasar silenciosamente. No puede atrapar el crash nativo
 * de Android System WebView (ocurre antes de que este script corra).
 */
export function ClientErrorListener() {
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      logClientError({ message: event.message, stack: event.error?.stack }, "window-onerror");
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;
      logClientError({ message, stack }, "unhandled-rejection");
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
