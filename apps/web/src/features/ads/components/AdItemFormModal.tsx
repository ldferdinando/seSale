"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adItemFormSchema } from "@/features/ads/schemas/ad-item-schema";
import { useUploadAdItemImage } from "@/features/ads/hooks/useAdminAds";
import type { AdItemAdmin, AdSlotAdmin } from "@/features/ads/types";
import type { User } from "@/features/auth/types";
import { UserPicker } from "@/features/users/components/UserPicker";
import { ApiError } from "@/lib/api-client";
import { resolveMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

interface AdItemFormModalProps {
  slot: AdSlotAdmin;
  item?: AdItemAdmin;
  onSave: (input: {
    user_id: string;
    img_url: string;
    link_url?: string;
    alt_text?: string;
    advertiser_name?: string;
    starts_at: string;
    ends_at?: string;
    display_order: number;
  }) => Promise<{ id: string }>;
  isSaving: boolean;
  saveError: string | null;
  onCancel: () => void;
}

/** Orden visual de los campos validados: al fallar la validación se enfoca
 * el primero de esta lista que tenga error. */
const FIELD_ORDER = ["user_id", "img_url", "link_url", "starts_at", "ends_at"] as const;
type FieldKey = (typeof FIELD_ORDER)[number];

/** Carga/edición de un AdItem (Etapa 8d, PARTE 8c/8d). El slot y (al editar)
 * el anunciante no se pueden cambiar — ver a_revisar.md/consigna. */
export function AdItemFormModal({ slot, item, onSave, isSaving, saveError, onCancel }: AdItemFormModalProps) {
  const uploadImage = useUploadAdItemImage();

  const [userId, setUserId] = useState(item?.user_id ?? "");
  const [advertiserName, setAdvertiserName] = useState(item?.advertiser_name ?? "");
  const [imgUrl, setImgUrl] = useState(item?.img_url ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState(item?.link_url ?? "");
  const [altText, setAltText] = useState(item?.alt_text ?? "");
  const [startsAt, setStartsAt] = useState(item?.starts_at ?? new Date().toISOString().slice(0, 10));
  const [endsAt, setEndsAt] = useState(item?.ends_at ?? "");
  const [displayOrder, setDisplayOrder] = useState(
    item?.display_order ?? (slot.items.length > 0 ? Math.max(...slot.items.map((i) => i.display_order)) + 1 : 0),
  );
  // Nombre que se autocompletó desde el usuario elegido: si el admin no lo
  // editó, se reemplaza al cambiar de anunciante; si lo editó, se respeta.
  const [autoAdvertiserName, setAutoAdvertiserName] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fieldRefs = useRef<Partial<Record<FieldKey, HTMLElement | null>>>({});
  const isEditing = !!item;

  function handleUserChange(user: User | null) {
    setUserId(user?.id ?? "");
    if (user) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.user_id;
        return next;
      });
      if (!advertiserName || advertiserName === autoAdvertiserName) {
        setAdvertiserName(user.public_name);
        setAutoAdvertiserName(user.public_name);
      }
    } else {
      // "Cambiar": el foco vuelve al buscador que reaparece.
      requestAnimationFrame(() => fieldRefs.current.user_id?.focus());
    }
  }

  function focusFirstInvalid(fieldErrors: Record<string, string>) {
    const first = FIELD_ORDER.find((key) => fieldErrors[key]);
    const el = first ? fieldRefs.current[first] : null;
    if (!el) return;
    el.scrollIntoView?.({ block: "center", behavior: "smooth" });
    el.focus({ preventScroll: true });
  }

  function fieldProps(key: FieldKey) {
    return {
      "aria-invalid": errors[key] ? true : undefined,
      "aria-describedby": errors[key] ? `ad-error-${key}` : undefined,
    };
  }

  function fieldError(field: FieldKey) {
    if (!errors[field]) return null;
    return (
      <p id={`ad-error-${field}`} role="alert" className="text-xs font-medium text-destructive">
        {errors[field]}
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = adItemFormSchema.safeParse({
      user_id: userId,
      img_url: imgUrl || (imageFile ? "pending-upload" : ""),
      link_url: linkUrl,
      alt_text: altText,
      advertiser_name: advertiserName,
      starts_at: startsAt,
      ends_at: endsAt,
      display_order: displayOrder,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      focusFirstInvalid(fieldErrors);
      return;
    }
    setErrors({});

    try {
      const saved = await onSave({
        user_id: userId,
        img_url: imgUrl || "https://placeholder.invalid/pending",
        link_url: linkUrl || undefined,
        alt_text: altText || undefined,
        advertiser_name: advertiserName || undefined,
        starts_at: startsAt,
        ends_at: endsAt || undefined,
        display_order: displayOrder,
      });

      if (imageFile) {
        await uploadImage.mutateAsync({ adItemId: saved.id, file: imageFile });
      }
    } catch {
      // el error se muestra abajo (saveError)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? "Editar banner" : "Agregar banner"}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onCancel}
    >
      <form
        noValidate
        autoComplete="off"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-2xl bg-card p-5 sm:rounded-2xl"
      >
        <h2 className="text-base font-bold text-foreground">{isEditing ? "Editar banner" : "Agregar banner"}</h2>

        <p className="text-xs text-ink-4">
          Slot: {slot.section === "eventos-grid" ? "Banners grilla" : `Carrusel ${slot.slot_position + 1}`} ·{" "}
          {slot.rotation_mode === "random" ? "Rotación aleatoria" : "Rotación secuencial"}
        </p>

        <div className="flex flex-col gap-1">
          <Label htmlFor="ad-user">Anunciante *</Label>
          {isEditing ? (
            <p className="text-sm text-ink-2">{item.user_public_name}</p>
          ) : (
            <UserPicker
              ref={(el) => {
                fieldRefs.current.user_id = el;
              }}
              id="ad-user"
              value={userId || null}
              onChange={handleUserChange}
              searchLabel="Buscar anunciante"
              invalid={!!errors.user_id}
              errorId={errors.user_id ? "ad-error-user_id" : undefined}
            />
          )}
          {fieldError("user_id")}
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="ad-advertiser-name">Nombre del anunciante</Label>
          <Input
            id="ad-advertiser-name"
            name="ad-advertiser-label"
            autoComplete="off"
            value={advertiserName}
            onChange={(e) => setAdvertiserName(e.target.value)}
            placeholder="Se copia del anunciante si se deja vacío"
            aria-describedby="ad-advertiser-name-help"
          />
          <p id="ad-advertiser-name-help" className="text-xs text-ink-4">
            Se completa con el nombre público del anunciante elegido. Podés editarlo.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="ad-image-file">Imagen</Label>
          <input
            ref={(el) => {
              fieldRefs.current.img_url = el;
            }}
            id="ad-image-file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            {...fieldProps("img_url")}
            className={cn(
              "rounded-md text-sm text-ink-3",
              errors.img_url && "outline outline-1 outline-offset-2 outline-destructive",
            )}
          />
          <Label htmlFor="ad-image-url" className="mt-1">
            O pegá una URL ya hosteada
          </Label>
          <Input
            id="ad-image-url"
            autoComplete="off"
            value={imgUrl}
            onChange={(e) => setImgUrl(e.target.value)}
            placeholder="https://..."
            {...fieldProps("img_url")}
          />
          {imgUrl && (
            <img
              src={resolveMediaUrl(imgUrl) ?? imgUrl}
              alt="Preview"
              className="mt-1 h-24 w-full rounded-lg object-cover"
            />
          )}
          {fieldError("img_url")}
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="ad-link">Link de destino</Label>
          <Input
            ref={(el) => {
              fieldRefs.current.link_url = el;
            }}
            id="ad-link"
            autoComplete="off"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            {...fieldProps("link_url")}
          />
          {fieldError("link_url")}
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="ad-alt">Texto alternativo</Label>
          <Input id="ad-alt" autoComplete="off" value={altText} onChange={(e) => setAltText(e.target.value)} />
        </div>

        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="ad-starts">Fecha de inicio *</Label>
            <Input
              ref={(el) => {
                fieldRefs.current.starts_at = el;
              }}
              id="ad-starts"
              type="date"
              autoComplete="off"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              {...fieldProps("starts_at")}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="ad-ends">Fecha de fin</Label>
            <Input
              ref={(el) => {
                fieldRefs.current.ends_at = el;
              }}
              id="ad-ends"
              type="date"
              autoComplete="off"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              {...fieldProps("ends_at")}
            />
          </div>
        </div>
        {fieldError("starts_at")}
        {fieldError("ends_at")}

        {slot.rotation_mode === "sequential" && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="ad-order">Orden</Label>
            <Input
              id="ad-order"
              type="number"
              min={0}
              autoComplete="off"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(Number(e.target.value))}
            />
          </div>
        )}

        {Object.keys(errors).length > 0 && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive"
          >
            Completá los campos marcados.
          </p>
        )}

        {saveError && (
          <p role="alert" className="text-sm text-destructive">
            {saveError}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving || uploadImage.isPending} className="flex-1">
            {isSaving || uploadImage.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function saveErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "No pudimos guardar el banner.";
}
