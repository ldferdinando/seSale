"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AdGridPool } from "@/components/AdGridPool";
import { useCreateAdItem, useUpdateAdItem } from "@/features/ads/hooks/useAdminAds";
import { AdItemFormModal, saveErrorMessage } from "@/features/ads/components/AdItemFormModal";
import { AdItemRow } from "@/features/ads/components/AdSlotCard";
import type { AdItemAdmin, AdSlotAdmin } from "@/features/ads/types";

/**
 * Card admin para la sección "eventos-grid": a diferencia de "eventos" y
 * "gastronomia" (un AdSlotCard por slot), acá TODOS los AdSlot de la sección
 * se tratan como un único pool de AdItems — el admin no elige posición, solo
 * carga banners. Los AdItem nuevos se crean siempre contra el slot de
 * slot_position=0 (`primarySlot`).
 */
export function AdGridPoolCard({ slots }: { slots: AdSlotAdmin[] }) {
  const [adding, setAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<AdItemAdmin | null>(null);
  const createItem = useCreateAdItem();
  const updateItem = useUpdateAdItem(editingItem?.id ?? "");
  const [saveError, setSaveError] = useState<string | null>(null);

  const sortedSlots = [...slots].sort((a, b) => a.slot_position - b.slot_position);
  const primarySlot = sortedSlots.find((s) => s.slot_position === 0) ?? sortedSlots[0];
  const items = sortedSlots.flatMap((s) => s.items);
  const showForm = adding || editingItem;

  if (!primarySlot) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-foreground">Banners grilla</h3>
          <p className="text-xs text-ink-5">Rotación aleatoria — pool compartido de 2 columnas</p>
        </div>
        {!showForm && (
          <Button type="button" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Agregar banner
          </Button>
        )}
      </div>

      <AdGridPool items={items} rotationIntervalSeconds={primarySlot.rotation_interval_seconds} />

      {showForm && (
        <AdItemFormModal
          slot={primarySlot}
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
              const saved = await createItem.mutateAsync({ slot_id: primarySlot.id, ...input });
              setAdding(false);
              return saved;
            } catch (err) {
              setSaveError(saveErrorMessage(err));
              throw err;
            }
          }}
        />
      )}

      {items.length === 0 && !showForm && <p className="text-xs text-ink-5">Sin banners cargados en la grilla.</p>}

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <AdItemRow key={item.id} item={item} draggable={false} onEdit={() => setEditingItem(item)} />
        ))}
      </div>
    </div>
  );
}
