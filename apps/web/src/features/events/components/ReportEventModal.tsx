"use client";

import { useState } from "react";
import { Flag, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useReportEvent } from "@/features/reports/hooks/useReportEvent";
import { ApiError } from "@/lib/api-client";

const MIN_TEXT_LENGTH = 10;
const MAX_TEXT_LENGTH = 1000;

interface ReportEventModalProps {
  eventId: string;
  onClose: () => void;
}

export function ReportEventModal({ eventId, onClose }: ReportEventModalProps) {
  const [text, setText] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const reportEvent = useReportEvent(eventId);

  const submitted = reportEvent.isSuccess;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (text.trim().length < MIN_TEXT_LENGTH) {
      setValidationError(`La descripción debe tener al menos ${MIN_TEXT_LENGTH} caracteres.`);
      return;
    }
    if (!contactPhone.trim()) {
      setValidationError("Ingresá un teléfono de contacto.");
      return;
    }

    reportEvent.mutate({ text: text.trim(), contact_phone: contactPhone.trim() });
  }

  const errorMessage =
    reportEvent.error instanceof ApiError
      ? reportEvent.error.status === 429
        ? "Ya enviaste varios reportes recientemente. Intentá más tarde."
        : "No pudimos enviar tu reporte. Intentá de nuevo."
      : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reportar este evento"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col gap-4 rounded-t-2xl bg-card p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-destructive" aria-hidden />
            <h2 className="text-base font-bold text-foreground">Reportar este evento</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-ink-4">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {submitted ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-foreground">
              Tu reporte fue enviado. Gracias por ayudarnos a mantener seSALE.
            </p>
            <Button type="button" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <p className="text-sm text-ink-3">
              Si este evento tiene información incorrecta o inapropiada, podés reportarlo. Un
              administrador lo revisará.
            </p>

            <div className="flex flex-col gap-1">
              <Label htmlFor="report-text">Descripción del problema</Label>
              <Textarea
                id="report-text"
                rows={3}
                maxLength={MAX_TEXT_LENGTH}
                placeholder="Describí el problema con este evento..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="report-phone">Tu teléfono de contacto</Label>
              <Input
                id="report-phone"
                placeholder="Ej: 2984123456"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>

            {(validationError || errorMessage) && (
              <p role="alert" className="text-sm text-destructive">
                {validationError ?? errorMessage}
              </p>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={reportEvent.isPending} className="flex-1">
                {reportEvent.isPending ? "Enviando..." : "Enviar reporte"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
