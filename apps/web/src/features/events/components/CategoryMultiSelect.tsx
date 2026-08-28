"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useCategoryCatalog } from "@/features/events/hooks/useCategoryCatalog";
import { CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE } from "@/features/events/lib/categoryStyles";
import { MAX_EVENT_CATEGORIES } from "@/features/events/types";
import { cn } from "@/lib/utils";

interface CategoryMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
}

/** Checkboxes de categoría — hasta MAX_EVENT_CATEGORIES seleccionadas a la vez.
 * Categorías cargadas desde GET /api/categories (Etapa 12a): skeleton
 * mientras cargan, fallback hardcodeado si falla — ver useCategoryCatalog. */
export function CategoryMultiSelect({ value, onChange }: CategoryMultiSelectProps) {
  const { categories, isLoading } = useCategoryCatalog();
  const limitReached = value.length >= MAX_EVENT_CATEGORIES;

  function toggle(category: string) {
    if (value.includes(category)) {
      onChange(value.filter((c) => c !== category));
      return;
    }
    if (limitReached) return;
    onChange([...value, category]);
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2" data-testid="category-multiselect-loading">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Categorías">
      {categories.map((c) => {
        const style = CATEGORY_STYLES[c.key] ?? DEFAULT_CATEGORY_STYLE;
        const Icon = style.icon;
        const checked = value.includes(c.key);
        const disabled = !checked && limitReached;

        return (
          <label
            key={c.key}
            title={disabled ? "Máximo 3 categorías" : undefined}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
              checked ? "border-primary bg-brand-pinkBg text-foreground" : "border-border bg-card text-ink-2",
              disabled && "cursor-not-allowed opacity-40",
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => toggle(c.key)}
              className="h-4 w-4 accent-primary"
            />
            {c.emoji ? (
              <span aria-hidden>{c.emoji}</span>
            ) : (
              <Icon className="h-3.5 w-3.5" style={{ color: c.color ?? style.color }} aria-hidden />
            )}
            {c.emoji ? ` ${c.name}` : c.name}
          </label>
        );
      })}
    </div>
  );
}
