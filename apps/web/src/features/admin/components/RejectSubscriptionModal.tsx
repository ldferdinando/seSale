"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RejectSubscriptionModalProps {
  isSubmitting?: boolean;
  onReject: (adminNotes: string | undefined) => void;
  onClose: () => void;
}

/** Modal a mano (sin @radix-ui/react-dialog) — mismo patrón que ReportEventModal.tsx. */
export function RejectSubscriptionModal({ isSubmitting, onReject, onClose }: RejectSubscriptionModalProps) {
  const [notes, setNotes] = useState("");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rechazar suscripción"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-sm flex-col gap-4 rounded-t-2xl bg-card p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-foreground">Rechazar suscripción</h2>

        <div className="flex flex-col gap-1">
          <Label htmlFor="reject-notes">Motivo (opcional)</Label>
          <Textarea
            id="reject-notes"
            rows={3}
            maxLength={1000}
            placeholder="Ej: No encontramos el pago en la cuenta"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => onReject(notes.trim() || undefined)}
            className="flex-1"
          >
            {isSubmitting ? "Procesando..." : "Rechazar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
