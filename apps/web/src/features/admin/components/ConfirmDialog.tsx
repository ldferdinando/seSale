"use client";

import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  isConfirming?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Diálogo de confirmación construido a mano (sin @radix-ui/react-dialog, no
 * está instalado en el proyecto — mismo patrón que ReportEventModal.tsx).
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  isConfirming,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-sm flex-col gap-4 rounded-t-2xl bg-card p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        <p className="text-sm text-ink-3">{description}</p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="button" disabled={isConfirming} onClick={onConfirm} className="flex-1">
            {isConfirming ? "Procesando..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
