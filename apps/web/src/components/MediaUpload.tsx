"use client";

import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/features/admin/components/ConfirmDialog";
import { deleteEventFlyer, uploadEventFlyer } from "@/features/events/services/events-api";
import { deleteGastroCover, uploadGastroCover } from "@/features/gastro/services/gastro-api";
import { ApiError } from "@/lib/api-client";
import { resolveMediaUrl } from "@/lib/media";

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp";
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export type MediaUploadType = "flyer-desktop" | "flyer-mobile" | "cover";

/** Config por tipo — Etapa 8e: FlyerUpload.tsx (Etapa 8b) generalizado a
 * MediaUpload.tsx para no duplicar código entre el flyer de eventos y la
 * portada de lugares gastronómicos. Etapa 12b: el flyer de eventos pasa a
 * ser dual (desktop/mobile) — dos entradas independientes que apuntan a
 * `.../flyer/desktop` y `.../flyer/mobile`. El wrapper FlyerUpload.tsx
 * compone las dos zonas. Mismos límites/formatos, solo cambian el endpoint,
 * el texto y el aspect-ratio de la preview. */
const MEDIA_CONFIG: Record<
  MediaUploadType,
  {
    label: string;
    dropZoneLabel: string;
    imageAlt: string;
    aspectClassName: string;
    upload: (id: string, file: File) => Promise<{ url: string | null }>;
    remove: (id: string) => Promise<{ url: string | null }>;
  }
> = {
  "flyer-desktop": {
    label: "Flyer para desktop y tablet",
    dropZoneLabel: "Subir flyer (JPG, PNG o WEBP, máx. 5MB)",
    imageAlt: "Flyer del evento (desktop)",
    aspectClassName: "aspect-[1200/630] w-full",
    upload: async (id, file) => {
      const res = await uploadEventFlyer(id, "desktop", file);
      return { url: res.flyer_url_desktop };
    },
    remove: async (id) => {
      const res = await deleteEventFlyer(id, "desktop");
      return { url: res.flyer_url_desktop };
    },
  },
  "flyer-mobile": {
    label: "Flyer para mobile (opcional)",
    dropZoneLabel: "Subir flyer (JPG, PNG o WEBP, máx. 5MB)",
    imageAlt: "Flyer del evento (mobile)",
    aspectClassName: "aspect-[630/1200] w-full max-w-[220px]",
    upload: async (id, file) => {
      const res = await uploadEventFlyer(id, "mobile", file);
      return { url: res.flyer_url_mobile };
    },
    remove: async (id) => {
      const res = await deleteEventFlyer(id, "mobile");
      return { url: res.flyer_url_mobile };
    },
  },
  cover: {
    label: "Foto de portada",
    dropZoneLabel: "Subir portada (JPG, PNG o WEBP, máx. 5MB)",
    imageAlt: "Foto de portada del lugar",
    aspectClassName: "aspect-[16/9] w-full",
    upload: async (id, file) => {
      const res = await uploadGastroCover(id, file);
      return { url: res.cover_img_url };
    },
    remove: async (id) => {
      const res = await deleteGastroCover(id);
      return { url: res.cover_img_url };
    },
  },
};

interface MediaUploadProps {
  type: MediaUploadType;
  entityId: string;
  currentUrl: string | null;
  onUploadSuccess: (url: string) => void;
  onDeleteSuccess: () => void;
}

/**
 * Subir/cambiar/eliminar una imagen (flyer de evento o portada de lugar
 * gastronómico) — mismo patrón visual y de storage para los dos casos, ver
 * MEDIA_CONFIG arriba. El caller decide cuándo renderizarlo (ej.
 * FlyerUpload solo se mostraba con event.plan === "pro" — esa regla sigue
 * viviendo en el caller, no acá).
 */
export function MediaUpload({ type, entityId, currentUrl, onUploadSuccess, onDeleteSuccess }: MediaUploadProps) {
  const config = MEDIA_CONFIG[type];
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
      const { url } = await config.upload(entityId, selectedFile);
      setSuccessMessage(type === "cover" ? "Portada subida correctamente." : "Flyer subido correctamente.");
      setSelectedFile(null);
      setPreviewUrl(null);
      if (url) onUploadSuccess(url);
    } catch (error) {
      setUploadError(
        error instanceof ApiError ? error.message : "No pudimos subir la imagen. Intentá de nuevo.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await config.remove(entityId);
      setConfirmingDelete(false);
      onDeleteSuccess();
    } catch (error) {
      setDeleteError(
        error instanceof ApiError ? error.message : "No pudimos eliminar la imagen. Intentá de nuevo.",
      );
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

  const showExisting = currentUrl && !previewUrl;

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-3">
        <ImagePlus className="h-3.5 w-3.5 text-primary" aria-hidden />
        {config.label}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={handleFileChange}
        data-testid="media-file-input"
      />

      {showExisting && (
        <div className="flex flex-col gap-3" data-testid="media-current-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveMediaUrl(currentUrl) ?? undefined}
            alt={config.imageAlt}
            className={`rounded-xl border border-border object-cover ${config.aspectClassName}`}
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

      {!showExisting && !previewUrl && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          data-testid="media-drop-zone"
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-surface-4 bg-surface-2 px-4 py-8 text-center text-ink-3 transition-colors hover:border-primary/60 hover:text-foreground"
        >
          <Upload className="h-6 w-6 text-primary" aria-hidden />
          <span className="text-xs font-bold">{config.dropZoneLabel}</span>
        </button>
      )}

      {previewUrl && (
        <div className="flex flex-col gap-3" data-testid="media-new-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={`Vista previa: ${config.imageAlt.toLowerCase()}`}
            className={`rounded-xl border border-border object-cover ${config.aspectClassName}`}
          />
          <div className="flex gap-2">
            <Button type="button" onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                  Subiendo...
                </>
              ) : (
                "Subir"
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
          title={type === "cover" ? "¿Eliminar la portada?" : "¿Eliminar el flyer?"}
          description="Esta acción borra la imagen. Vas a poder subir otra cuando quieras."
          confirmLabel="Sí, eliminar"
          isConfirming={isDeleting}
          onConfirm={handleDelete}
          onClose={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
