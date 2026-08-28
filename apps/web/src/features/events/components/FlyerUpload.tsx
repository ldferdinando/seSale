"use client";

import { ImagePlus } from "lucide-react";

import { MediaUpload } from "@/components/MediaUpload";
import { resolveMediaUrl } from "@/lib/media";

interface FlyerUploadProps {
  eventId: string;
  flyerUrlDesktop: string | null;
  flyerUrlMobile: string | null;
  /** Etapa 12b — quién puede subir/cambiar/eliminar: el organizador dueño
   * con plan Destacado Plus, o un admin (cualquier plan). Si es `false`,
   * solo se muestra el preview de lo que ya haya cargado, sin acciones. */
  canUpload: boolean;
  onChange: () => void;
}

const DESKTOP_SUBTITLE = "Formato recomendado: horizontal (1200×630px) o cuadrado.";
const MOBILE_SUBTITLE =
  "Formato recomendado: vertical (630×1200px) o cuadrado. Si no subís uno, se usa el de desktop.";

function ReadonlyPreview({ label, url, alt }: { label: string; url: string | null; alt: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-3">
        <ImagePlus className="h-3.5 w-3.5 text-primary" aria-hidden />
        {label}
      </p>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolveMediaUrl(url) ?? undefined}
          alt={alt}
          className="w-full max-w-[280px] rounded-xl border border-border object-cover"
        />
      ) : (
        <p className="text-xs text-ink-5">Sin imagen cargada.</p>
      )}
    </div>
  );
}

/**
 * Etapa 12b — dos zonas de subida de flyer independientes: una para
 * desktop/tablet y otra (opcional) para mobile. Cada zona reusa
 * `MediaUpload` (estados vacío / preview / cargando / con imagen). La zona
 * de mobile puede quedar vacía sin problema — en ese caso el `<picture>`
 * del frontend usa el flyer de desktop para todas las resoluciones.
 */
export function FlyerUpload({
  eventId,
  flyerUrlDesktop,
  flyerUrlMobile,
  canUpload,
  onChange,
}: FlyerUploadProps) {
  if (!canUpload) {
    return (
      <div className="flex flex-col gap-5" data-testid="flyer-upload-readonly">
        <ReadonlyPreview label="Flyer para desktop y tablet" url={flyerUrlDesktop} alt="Flyer del evento (desktop)" />
        <ReadonlyPreview label="Flyer para mobile" url={flyerUrlMobile} alt="Flyer del evento (mobile)" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="flyer-upload">
      <div className="flex flex-col gap-2">
        <MediaUpload
          type="flyer-desktop"
          entityId={eventId}
          currentUrl={flyerUrlDesktop}
          onUploadSuccess={onChange}
          onDeleteSuccess={onChange}
        />
        <p className="text-xs text-ink-5">{DESKTOP_SUBTITLE}</p>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-5">
        <MediaUpload
          type="flyer-mobile"
          entityId={eventId}
          currentUrl={flyerUrlMobile}
          onUploadSuccess={onChange}
          onDeleteSuccess={onChange}
        />
        <p className="text-xs text-ink-5">{MOBILE_SUBTITLE}</p>
      </div>
    </div>
  );
}
