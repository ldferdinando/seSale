"use client";

import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/features/admin/components/ConfirmDialog";
import { deleteEventFlyer, uploadEventFlyer } from "@/features/events/services/events-api";
import { ApiError } from "@/lib/api-client";
import { resolveMediaUrl } from "@/lib/media";

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp";
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

interface FlyerUploadProps {
  eventId: string;
  currentFlyerUrl: string | null;
  onUploadSuccess: (url: string) => void;
  onDeleteSuccess: () => void;
}

/**
 * Flyer del evento — exclusivo del plan Destacado Plus (ver a_revisar.md,
 * Etapa 8b: la regla de negocio sigue seSALE_primario.html, que solo
 * muestra la subida con Destacado Plus, nunca con Destacado). El caller
 * (EditarEventoClient) es responsable de no renderizar este componente si
 * event.plan !== "pro".
 */
export function FlyerUpload({ eventId, currentFlyerUrl, onUploadSuccess, onDeleteSuccess }: FlyerUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Formato no permitido. Subí un archivo JPG, PNG o WEBP.";
    }
    if (file.size > MAX_SIZE_BYTES) {
      return "El archivo supera el tamaño máximo permitido (5MB).";
    }
    return null;
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setSuccessMessage(null);
    setUploadError(null);

    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setValidationError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleUpload() {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const response = await uploadEventFlyer(eventId, selectedFile);
      setSuccessMessage("Flyer subido correctamente.");
      setSelectedFile(null);
      setPreviewUrl(null);
      if (response.flyer_url) onUploadSuccess(response.flyer_url);
    } catch (error) {
      setUploadError(error instanceof ApiError ? error.message : "No pudimos subir el flyer. Intentá de nuevo.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteEventFlyer(eventId);
      setConfirmingDelete(false);
      onDeleteSuccess();
    } catch (error) {
      setDeleteError(error instanceof ApiError ? error.message : "No pudimos eliminar el flyer. Intentá de nuevo.");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleCancelPreview() {
    setSelectedFile(null);
    setPreviewUrl(null);
    setValidationError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const showExistingFlyer = currentFlyerUrl && !previewUrl;

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-3">
        <ImagePlus className="h-3.5 w-3.5 text-primary" aria-hidden />
        Flyer del evento
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={handleFileChange}
        data-testid="flyer-file-input"
      />

      {showExistingFlyer && (
        <div className="flex flex-col gap-3" data-testid="flyer-current-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveMediaUrl(currentFlyerUrl) ?? undefined}
            alt="Flyer actual del evento"
            className="aspect-[3/4] w-full max-w-[220px] rounded-xl border border-border object-cover"
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
              Cambiar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
              Eliminar
            </Button>
          </div>
          {deleteError && (
            <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden />
              {deleteError}
            </p>
          )}
        </div>
      )}

      {!showExistingFlyer && !previewUrl && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          data-testid="flyer-drop-zone"
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-surface-4 bg-surface-2 px-4 py-8 text-center text-ink-3 transition-colors hover:border-primary/60 hover:text-foreground"
        >
          <Upload className="h-6 w-6 text-primary" aria-hidden />
          <span className="text-xs font-bold">Subir flyer (JPG, PNG o WEBP, máx. 5MB)</span>
        </button>
      )}

      {previewUrl && (
        <div className="flex flex-col gap-3" data-testid="flyer-new-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Vista previa del flyer a subir"
            className="aspect-[3/4] w-full max-w-[220px] rounded-xl border border-border object-cover"
          />
          <div className="flex gap-2">
            <Button type="button" onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                  Subiendo...
                </>
              ) : (
                "Subir flyer"
              )}
            </Button>
            <Button type="button" variant="ghost" onClick={handleCancelPreview} disabled={isUploading}>
              Cancelar
            </Button>
          </div>
          {uploadError && (
            <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden />
              {uploadError}
            </p>
          )}
        </div>
      )}

      {validationError && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden />
          {validationError}
        </p>
      )}

      {successMessage && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-green">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          {successMessage}
        </p>
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title="¿Eliminar el flyer?"
          description="Esta acción borra la imagen del evento. Vas a poder subir otra cuando quieras."
          confirmLabel="Sí, eliminar"
          isConfirming={isDeleting}
          onConfirm={handleDelete}
          onClose={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
