"use client";

import { LogIn, Sparkles } from "lucide-react";

interface PublishGateModalProps {
  onLogin: () => void;
  onContinueBrowsing: () => void;
}

/**
 * Etapa "Cambios de diseño TIPO B v2.2" (punto 4 — Bottom nav "Publicar").
 * Popup que se muestra al tocar "Publicar" en el bottom nav SIN sesión
 * iniciada (con sesión, `BottomNav` salta directo a /publicar — el
 * middleware ya protege esa ruta, pero saltearla evita el ida-y-vuelta de
 * un redirect). Aclara que navegar y publicar son gratis (el pedido
 * explícito) antes de pedir login. Diálogo armado a mano, mismo patrón que
 * `ConfirmDialog`/`ReportEventModal` (sin @radix-ui/react-dialog).
 */
export function PublishGateModal({ onLogin, onContinueBrowsing }: PublishGateModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Publicar un evento"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onContinueBrowsing}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-sm flex-col gap-4 overflow-y-auto rounded-t-2xl bg-card p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-pinkBg text-primary">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <h2 className="text-base font-bold text-foreground">Publicar un evento es gratis</h2>
          <p className="text-sm text-ink-3">
            Navegar por seSALE es gratis y publicar tu evento también — solo necesitás una cuenta para
            que podamos avisarte cuando lo aprobemos.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onLogin}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
          >
            <LogIn className="h-4 w-4" aria-hidden />
            Ingresar para publicar
          </button>
          <button
            type="button"
            onClick={onContinueBrowsing}
            className="rounded-xl border border-border bg-transparent px-4 py-3 text-sm font-bold text-ink-3"
          >
            Seguir navegando
          </button>
        </div>
      </div>
    </div>
  );
}
