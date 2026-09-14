"use client";

import { useState } from "react";
import { Flag, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useReportLocation } from "@/features/reports/hooks/useReportLocation";
import { ApiError } from "@/lib/api-client";

const MIN_TEXT_LENGTH = 10;
const MAX_TEXT_LENGTH = 1000;

interface ReportPlaceModalProps {
  locationId: string;
  onClose: () => void;
}

/**
 * Mismo patrón que ReportEventModal.tsx (Etapa 6.5) — se duplica en vez de
 * generalizar en un componente compartido: la diferencia es solo el hook/
 * endpoint y los textos, y mantenerlos separados evita tocar el modal de
 * eventos (con sus propios tests) por un cambio que es exclusivo de lugares.
 * Ver a_revisar.md, etapa "Ficha de Lugar v2.2".
 */
export function ReportPlaceModal({ locationId, onClose }: ReportPlaceModalProps) {
  const [text, setText] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const reportLocation = useReportLocation(locationId);

  const submitted = reportLocation.isSuccess;

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

    reportLocation.mutate({ text: text.trim(), contact_phone: contactPhone.trim() });
  }

  const errorMessage =
    reportLocation.error instanceof ApiError
      ? reportLocation.error.status === 429
        ? "Ya enviaste varios reportes recientemente. Intentá más tarde."
        : "No pudimos enviar tu reporte. Intentá de nuevo."
      : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reportar este lugar"
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
            <h2 className="text-base font-bold text-foreground">Reportar este lugar</h2>
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
              Si este lugar cerró, cambió de dirección o tiene información incorrecta, podés
              reportarlo. Un administrador lo revisará.
            </p>

            <div className="flex flex-col gap-1">
              <Label htmlFor="report-place-text">Descripción del problema</Label>
              <Textarea
                id="report-place-text"
                rows={3}
                maxLength={MAX_TEXT_LENGTH}
                placeholder="Describí el problema con este lugar..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="report-place-phone">Tu teléfono de contacto</Label>
              <Input
                id="report-place-phone"
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
              <Button type="submit" disabled={reportLocation.isPending} className="flex-1">
                {reportLocation.isPending ? "Enviando..." : "Enviar reporte"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
