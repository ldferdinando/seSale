"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminCategories, useCreateCategory, useToggleCategory, useUpdateCategory } from "@/features/events/hooks/useAdminCategories";
import type { CategoryAdmin } from "@/features/events/types";
import { ApiError } from "@/lib/api-client";

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");
}

interface CategoryFormProps {
  category?: CategoryAdmin;
  onSaved: () => void;
  onCancel: () => void;
}

function CategoryForm({ category, onSaved, onCancel }: CategoryFormProps) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory(category?.id ?? "");
  const [key, setKey] = useState(category?.key ?? "");
  const [name, setName] = useState(category?.name ?? "");
  const [emoji, setEmoji] = useState(category?.emoji ?? "");
  const [color, setColor] = useState(category?.color ?? "");
  const [sortOrder, setSortOrder] = useState(String(category?.sort_order ?? 99));

  const mutation = category ? updateCategory : createCategory;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (category) {
        await updateCategory.mutateAsync({
          name,
          emoji: emoji || undefined,
          color: color || undefined,
          sort_order: Number(sortOrder) || 99,
        });
      } else {
        await createCategory.mutateAsync({
          key: normalizeKey(key),
          name,
          emoji: emoji || undefined,
          color: color || undefined,
          sort_order: Number(sortOrder) || 99,
        });
      }
      onSaved();
    } catch {
      // el error se muestra abajo, ver mutation.isError
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-bold text-foreground">{category ? "Editar categoría" : "Nueva categoría"}</h3>

      <div className="flex flex-col gap-1">
        <Label htmlFor="cat-key">Key {category && "(no editable)"}</Label>
        <Input
          id="cat-key"
          value={key}
          onChange={(e) => setKey(normalizeKey(e.target.value))}
          placeholder="ej: cumbia, folklore, electronica"
          disabled={Boolean(category)}
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="cat-name">Nombre *</Label>
        <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="cat-emoji">Emoji</Label>
          <Input id="cat-emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={10} placeholder="🎵" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="cat-color">Color</Label>
          <Input id="cat-color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="#E91E8C" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="cat-sort">Orden</Label>
          <Input id="cat-sort" type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </div>
      </div>

      {mutation.isError && (
        <p role="alert" className="text-xs text-destructive">
          {mutation.error instanceof ApiError ? mutation.error.message : "No pudimos guardar la categoría."}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={mutation.isPending || !name || (!category && !key)}>
          Guardar
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function CategoryRow({ category, onEdit }: { category: CategoryAdmin; onEdit: () => void }) {
  const toggle = useToggleCategory();
  const [toggleError, setToggleError] = useState<string | null>(null);

  async function handleToggle() {
    setToggleError(null);
    try {
      await toggle.mutateAsync(category.id);
    } catch (err) {
      setToggleError(err instanceof ApiError ? err.message : "No pudimos actualizar la categoría.");
    }
  }

  return (
    <div data-testid="admin-category-row" className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {category.emoji && <span aria-hidden>{category.emoji}</span>}
          {category.color && (
            <span
              className="h-3 w-3 rounded-full border border-border"
              style={{ backgroundColor: category.color }}
              aria-hidden
            />
          )}
          <div>
            <p className="text-sm font-bold text-foreground">{category.name}</p>
            <p className="text-xs text-ink-4">{category.key}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onEdit}>
            Editar
          </Button>
          <button
            type="button"
            role="switch"
            aria-checked={category.is_active}
            aria-label={category.is_active ? "Desactivar categoría" : "Activar categoría"}
            disabled={toggle.isPending}
            onClick={handleToggle}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
              category.is_active ? "bg-[#1D9E75]" : "bg-surface-5"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                category.is_active ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>
      <p className="text-xs text-ink-4">Orden: {category.sort_order}</p>
      {toggleError && (
        <p role="alert" className="text-xs text-destructive">
          {toggleError}
        </p>
      )}
    </div>
  );
}

export function AdminCategoriesPanel() {
  const [isActiveFilter, setIsActiveFilter] = useState<string>("");
  const { data: categories, isLoading, isError } = useAdminCategories(
    isActiveFilter === "" ? undefined : isActiveFilter === "true",
  );
  const [creating, setCreating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryAdmin | null>(null);
  const showForm = creating || editingCategory;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-lg font-bold text-foreground">Categorías</h2>
        {!showForm && (
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Nueva categoría
          </Button>
        )}
      </div>

      {showForm && (
        <CategoryForm
          category={editingCategory ?? undefined}
          onSaved={() => {
            setCreating(false);
            setEditingCategory(null);
          }}
          onCancel={() => {
            setCreating(false);
            setEditingCategory(null);
          }}
        />
      )}

      {!showForm && (
        <>
          <div className="flex gap-2 px-1">
            <select
              value={isActiveFilter}
              onChange={(e) => setIsActiveFilter(e.target.value)}
              aria-label="Filtrar por estado"
              className="rounded-lg border border-border bg-card px-2 py-1 text-sm"
            >
              <option value="">Todas</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </select>
          </div>

          {isLoading && (
            <div data-testid="admin-categories-loading" className="flex flex-col gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {isError && (
            <p role="alert" className="text-sm text-muted-foreground">
              No pudimos cargar las categorías. Intentá de nuevo más tarde.
            </p>
          )}

          {categories && categories.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay categorías cargadas.</p>
          )}

          {categories && categories.length > 0 && (
            <div className="flex flex-col gap-3">
              {categories.map((category) => (
                <CategoryRow key={category.id} category={category} onEdit={() => setEditingCategory(category)} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
