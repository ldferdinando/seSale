"use client";

import { GripVertical, Plus } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BannerSlot } from "@/components/BannerSlot";
import { ConfirmDialog } from "@/features/admin/components/ConfirmDialog";
import {
  useCreateAdItem,
  useDeleteAdItem,
  useReorderAdItems,
  useToggleAdItemStatus,
  useUpdateAdItem,
} from "@/features/ads/hooks/useAdminAds";
import { AdItemFormModal, saveErrorMessage } from "@/features/ads/components/AdItemFormModal";
import type { AdItemAdmin, AdSlotAdmin } from "@/features/ads/types";
import { resolveMediaUrl } from "@/lib/media";

const STATUS_LABEL: Record<AdItemAdmin["status"], string> = {
  active: "Activo",
  paused: "Pausado",
  expired: "Vencido",
};

const STATUS_VARIANT: Record<AdItemAdmin["status"], "default" | "muted" | "pro"> = {
  active: "pro",
  paused: "muted",
  expired: "muted",
};

export function AdItemRow({
  item,
  draggable,
  onEdit,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  item: AdItemAdmin;
  draggable: boolean;
  onEdit: () => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
}) {
  const toggleStatus = useToggleAdItemStatus();
  const deleteItem = useDeleteAdItem();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleteError(null);
    try {
      await deleteItem.mutateAsync(item.id);
      setConfirmingDelete(false);
    } catch (err) {
      setDeleteError(saveErrorMessage(err));
    }
  }

  return (
    <div
      data-testid="ad-item-row"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="flex items-center gap-2 rounded-lg border border-border p-2"
    >
      {draggable && <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-ink-5" aria-hidden />}
      <img
        src={resolveMediaUrl(item.img_url) ?? item.img_url}
        alt=""
        className="h-12 w-16 shrink-0 rounded-md object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {item.advertiser_name || item.user_public_name}
        </p>
        <p className="text-xs text-ink-4">
          {item.starts_at} → {item.ends_at ?? "Sin fecha de vencimiento"}
        </p>
        <Badge variant={STATUS_VARIANT[item.status]} className="mt-1">
          {STATUS_LABEL[item.status]}
        </Badge>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        {item.status !== "expired" && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={toggleStatus.isPending}
            onClick={() =>
              toggleStatus.mutate({ adItemId: item.id, status: item.status === "active" ? "paused" : "active" })
            }
          >
            {item.status === "active" ? "Pausar" : "Activar"}
          </Button>
        )}
        <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
          Editar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingDelete(true)}>
          Eliminar
        </Button>
      </div>

      {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}

      {confirmingDelete && (
        <ConfirmDialog
          title="Eliminar banner"
          description="¿Seguro que querés eliminar este banner? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          isConfirming={deleteItem.isPending}
          onConfirm={handleDelete}
          onClose={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}

export function AdSlotCard({ slot }: { slot: AdSlotAdmin }) {
  const [adding, setAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<AdItemAdmin | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const createItem = useCreateAdItem();
  const updateItem = useUpdateAdItem(editingItem?.id ?? "");
  const reorder = useReorderAdItems();
  const [saveError, setSaveError] = useState<string | null>(null);

  const title = slot.section === "eventos-grid" ? `Tile ${slot.slot_position + 1}` : `Carrusel ${slot.slot_position + 1}`;
  const showForm = adding || editingItem;

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDrop(dropIndex: number) {
    if (dragIndex === null || dragIndex === dropIndex) return;
    const ids = slot.items.map((i) => i.id);
    const [moved] = ids.splice(dragIndex, 1);
    ids.splice(dropIndex, 0, moved);
    reorder.mutate({ slotId: slot.id, orderedIds: ids });
    setDragIndex(null);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          {slot.rotation_mode === "random" && <p className="text-xs text-ink-5">Rotación aleatoria</p>}
        </div>
        {!showForm && (
          <Button type="button" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Agregar banner
          </Button>
        )}
      </div>

      <BannerSlot slot={slot} />

      {showForm && (
        <AdItemFormModal
          slot={slot}
          item={editingItem ?? undefined}
          isSaving={createItem.isPending || updateItem.isPending}
          saveError={saveError}
          onCancel={() => {
            setAdding(false);
            setEditingItem(null);
            setSaveError(null);
          }}
          onSave={async (input) => {
            setSaveError(null);
            try {
              if (editingItem) {
                const saved = await updateItem.mutateAsync(input);
                setEditingItem(null);
                return saved;
              }
              const saved = await createItem.mutateAsync({ slot_id: slot.id, ...input });
              setAdding(false);
              return saved;
            } catch (err) {
              setSaveError(saveErrorMessage(err));
              throw err;
            }
          }}
        />
      )}

      {slot.items.length === 0 && !showForm && (
        <p className="text-xs text-ink-5">Sin banners cargados en este slot.</p>
      )}

      <div className="flex flex-col gap-2">
        {slot.items.map((item, index) => (
          <AdItemRow
            key={item.id}
            item={item}
            draggable={slot.rotation_mode === "sequential"}
            onEdit={() => setEditingItem(item)}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
          />
        ))}
      </div>
    </div>
  );
}
