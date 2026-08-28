"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminGastroTypes,
  useCreateGastroType,
  useToggleGastroType,
  useUpdateGastroType,
} from "@/features/gastro/hooks/useAdminGastroTypes";
import type { GastroTypeAdmin } from "@/features/gastro/types";
import { ApiError } from "@/lib/api-client";

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");
}

interface GastroTypeFormProps {
  gastroType?: GastroTypeAdmin;
  onSaved: () => void;
  onCancel: () => void;
}

function GastroTypeForm({ gastroType, onSaved, onCancel }: GastroTypeFormProps) {
  const createGastroType = useCreateGastroType();
  const updateGastroType = useUpdateGastroType(gastroType?.id ?? "");
  const [key, setKey] = useState(gastroType?.key ?? "");
  const [name, setName] = useState(gastroType?.name ?? "");
  const [emoji, setEmoji] = useState(gastroType?.emoji ?? "");
  const [sortOrder, setSortOrder] = useState(String(gastroType?.sort_order ?? 99));

  const mutation = gastroType ? updateGastroType : createGastroType;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (gastroType) {
        await updateGastroType.mutateAsync({ name, emoji: emoji || undefined, sort_order: Number(sortOrder) || 99 });
      } else {
        await createGastroType.mutateAsync({
          key: normalizeKey(key),
          name,
          emoji: emoji || undefined,
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
      <h3 className="text-sm font-bold text-foreground">{gastroType ? "Editar tipo" : "Nuevo tipo gastronómico"}</h3>

      <div className="flex flex-col gap-1">
        <Label htmlFor="gt-key">Key {gastroType && "(no editable)"}</Label>
        <Input
          id="gt-key"
          value={key}
          onChange={(e) => setKey(normalizeKey(e.target.value))}
          placeholder="ej: sushi, vegano, foodtruck"
          disabled={Boolean(gastroType)}
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="gt-name">Nombre *</Label>
        <Input id="gt-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="gt-emoji">Emoji</Label>
          <Input id="gt-emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={10} placeholder="🍺" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="gt-sort">Orden</Label>
          <Input id="gt-sort" type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </div>
      </div>

      {mutation.isError && (
        <p role="alert" className="text-xs text-destructive">
          {mutation.error instanceof ApiError ? mutation.error.message : "No pudimos guardar el tipo gastronómico."}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={mutation.isPending || !name || (!gastroType && !key)}>
          Guardar
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function GastroTypeRow({ gastroType, onEdit }: { gastroType: GastroTypeAdmin; onEdit: () => void }) {
  const toggle = useToggleGastroType();
  const [toggleError, setToggleError] = useState<string | null>(null);

  async function handleToggle() {
    setToggleError(null);
    try {
      await toggle.mutateAsync(gastroType.id);
    } catch (err) {
      setToggleError(err instanceof ApiError ? err.message : "No pudimos actualizar el tipo gastronómico.");
    }
  }

  return (
    <div data-testid="admin-gastro-type-row" className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {gastroType.emoji && <span aria-hidden>{gastroType.emoji}</span>}
          <div>
            <p className="text-sm font-bold text-foreground">{gastroType.name}</p>
            <p className="text-xs text-ink-4">{gastroType.key}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onEdit}>
            Editar
          </Button>
          <button
            type="button"
            role="switch"
            aria-checked={gastroType.is_active}
            aria-label={gastroType.is_active ? "Desactivar tipo" : "Activar tipo"}
            disabled={toggle.isPending}
            onClick={handleToggle}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
              gastroType.is_active ? "bg-[#1D9E75]" : "bg-surface-5"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                gastroType.is_active ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>
      <p className="text-xs text-ink-4">Orden: {gastroType.sort_order}</p>
      {toggleError && (
        <p role="alert" className="text-xs text-destructive">
          {toggleError}
        </p>
      )}
    </div>
  );
}

export function AdminGastroTypesPanel() {
  const [isActiveFilter, setIsActiveFilter] = useState<string>("");
  const { data: gastroTypes, isLoading, isError } = useAdminGastroTypes(
    isActiveFilter === "" ? undefined : isActiveFilter === "true",
  );
  const [creating, setCreating] = useState(false);
  const [editingGastroType, setEditingGastroType] = useState<GastroTypeAdmin | null>(null);
  const showForm = creating || editingGastroType;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-lg font-bold text-foreground">Tipos gastronómicos</h2>
        {!showForm && (
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Nuevo tipo
          </Button>
        )}
      </div>

      {showForm && (
        <GastroTypeForm
          gastroType={editingGastroType ?? undefined}
          onSaved={() => {
            setCreating(false);
            setEditingGastroType(null);
          }}
          onCancel={() => {
            setCreating(false);
            setEditingGastroType(null);
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
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>

          {isLoading && (
            <div data-testid="admin-gastro-types-loading" className="flex flex-col gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {isError && (
            <p role="alert" className="text-sm text-muted-foreground">
              No pudimos cargar los tipos gastronómicos. Intentá de nuevo más tarde.
            </p>
          )}

          {gastroTypes && gastroTypes.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay tipos cargados.</p>
          )}

          {gastroTypes && gastroTypes.length > 0 && (
            <div className="flex flex-col gap-3">
              {gastroTypes.map((gastroType) => (
                <GastroTypeRow
                  key={gastroType.id}
                  gastroType={gastroType}
                  onEdit={() => setEditingGastroType(gastroType)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
