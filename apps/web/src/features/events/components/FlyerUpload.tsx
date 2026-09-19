"use client";

import { ImagePlus } from "lucide-react";

import { MediaUpload } from "@/components/MediaUpload";
import { resolveMediaUrl } from "@/lib/media";

interface FlyerUploadProps {
  eventId: string;
  flyerUrl: string | null;
  /** Quién puede subir/cambiar/eliminar: el organizador dueño con plan
   * Destacado Plus, o un admin (cualquier plan). Si es `false`, solo se
   * muestra el preview de lo que ya haya cargado, sin acciones. */
  canUpload: boolean;
  onChange: () => void;
}

const FLYER_NOTE = "1080×1350px (proporción 4:5, como una publicación de Instagram).";

/**
 * Etapa "Diseño v3" — vuelve a una única zona de subida de flyer (antes
 * dos, desktop/mobile, Etapa 12b): reusa `MediaUpload` (estados vacío /
 * preview / cargando / con imagen).
 */
export function FlyerUpload({ eventId, flyerUrl, canUpload, onChange }: FlyerUploadProps) {
  if (!canUpload) {
    return (
      <div className="flex flex-col gap-2" data-testid="flyer-upload-readonly">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-3">
          <ImagePlus className="h-3.5 w-3.5 text-primary" aria-hidden />
          Flyer del evento
        </p>
        {flyerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveMediaUrl(flyerUrl) ?? undefined}
            alt="Flyer del evento"
            className="aspect-[1080/1350] w-full max-w-[280px] rounded-xl border border-border object-cover"
          />
        ) : (
          <p className="text-xs text-ink-5">Sin imagen cargada.</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" data-testid="flyer-upload">
      <MediaUpload
        type="flyer"
        entityId={eventId}
        currentUrl={flyerUrl}
        onUploadSuccess={onChange}
        onDeleteSuccess={onChange}
      />
      <p className="text-xs text-ink-5">{FLYER_NOTE}</p>
    </div>
  );
}
