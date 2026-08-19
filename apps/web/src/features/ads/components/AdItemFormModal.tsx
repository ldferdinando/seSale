"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adItemFormSchema } from "@/features/ads/schemas/ad-item-schema";
import { useUploadAdItemImage } from "@/features/ads/hooks/useAdminAds";
import type { AdItemAdmin, AdSlotAdmin } from "@/features/ads/types";
import { useUsersList } from "@/features/users/hooks/useUsersList";
import { ApiError } from "@/lib/api-client";
import { resolveMediaUrl } from "@/lib/media";

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

/** Carga/edición de un AdItem (Etapa 8d, PARTE 8c/8d). El slot y (al editar)
 * el anunciante no se pueden cambiar — ver a_revisar.md/consigna. */
export function AdItemFormModal({ slot, item, onSave, isSaving, saveError, onCancel }: AdItemFormModalProps) {
  const [search, setSearch] = useState("");
  const { data: users, isLoading: isLoadingUsers } = useUsersList(search);
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedUser = users?.find((u) => u.id === userId);
  const isEditing = !!item;

  function handleUserChange(id: string) {
    setUserId(id);
    const user = users?.find((u) => u.id === id);
    if (user && !advertiserName) setAdvertiserName(user.public_name);
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onCancel}
    >
      <form
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
            <>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o email..."
                aria-label="Buscar anunciante"
              />
              <Select value={userId || undefined} onValueChange={handleUserChange}>
                <SelectTrigger id="ad-user" aria-label="Anunciante">
                  <SelectValue placeholder="Elegí un usuario" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingUsers ? (
                    <div className="px-2 py-1.5 text-sm text-ink-5">Cargando usuarios...</div>
                  ) : users && users.length > 0 ? (
                    users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.public_name} — {u.email}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-ink-5">No se encontraron usuarios.</div>
                  )}
                </SelectContent>
              </Select>
            </>
          )}
          {errors.user_id && <p className="text-xs text-destructive">{errors.user_id}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="ad-advertiser-name">Nombre del anunciante</Label>
          <Input
            id="ad-advertiser-name"
            value={advertiserName}
            onChange={(e) => setAdvertiserName(e.target.value)}
            placeholder={selectedUser?.public_name ?? "Se copia del anunciante si se deja vacío"}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="ad-image-file">Imagen</Label>
          <input
            id="ad-image-file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            className="text-sm text-ink-3"
          />
          <Label htmlFor="ad-image-url" className="mt-1">
            O pegá una URL ya hosteada
          </Label>
          <Input
            id="ad-image-url"
            value={imgUrl}
            onChange={(e) => setImgUrl(e.target.value)}
            placeholder="https://..."
          />
          {imgUrl && (
            <img
              src={resolveMediaUrl(imgUrl) ?? imgUrl}
              alt="Preview"
              className="mt-1 h-24 w-full rounded-lg object-cover"
            />
          )}
          {errors.img_url && <p className="text-xs text-destructive">{errors.img_url}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="ad-link">Link de destino</Label>
          <Input id="ad-link" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
          {errors.link_url && <p className="text-xs text-destructive">{errors.link_url}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="ad-alt">Texto alternativo</Label>
          <Input id="ad-alt" value={altText} onChange={(e) => setAltText(e.target.value)} />
        </div>

        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="ad-starts">Fecha de inicio *</Label>
            <Input id="ad-starts" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="ad-ends">Fecha de fin</Label>
            <Input id="ad-ends" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
        </div>
        {errors.ends_at && <p className="text-xs text-destructive">{errors.ends_at}</p>}

        {slot.rotation_mode === "sequential" && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="ad-order">Orden</Label>
            <Input
              id="ad-order"
              type="number"
              min={0}
              value={displayOrder}
              onChange={(e) => setDisplayOrder(Number(e.target.value))}
            />
          </div>
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
