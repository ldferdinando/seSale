"use client";

import { CircleCheck, LogIn, Sparkles } from "lucide-react";

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
        {/* Copy exacto de #ipop-bg en seSALE.html — no parafrasear. */}
        <div className="flex flex-col gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-pinkBg text-primary">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <p className="text-sm text-ink-3">
            Esta sección es solo para quienes quieran registrar un evento o espacio.
          </p>
          <p className="text-sm text-ink-3">
            <b className="text-foreground">
              RECORDÁ QUE NAVEGAR ESTA AGENDA ES COMPLETAMENTE LIBRE Y GRATUITA, SIEMPRE.
            </b>
          </p>
          <div
            data-testid="publish-gate-free-box"
            className="flex items-start gap-2.5 rounded-xl border border-brand-green/40 bg-brand-green/10 p-3 text-sm text-ink-2"
          >
            <CircleCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-green" aria-hidden />
            <span>
              Publicar también es <b className="text-foreground">GRATIS</b>. Tendrás opciones pagas opcionales para
              destacar tu evento o espacio si así lo prefieres.
            </span>
          </div>
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
