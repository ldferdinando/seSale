"use client";

import { LayoutGrid, Tag } from "lucide-react";

import { useCategoryCatalog } from "@/features/events/hooks/useCategoryCatalog";
import { CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE } from "@/features/events/lib/categoryStyles";
import type { EventFiltersState } from "@/features/events/types";
import { cn } from "@/lib/utils";

interface CategoryChipsProps {
  category?: EventFiltersState["category"];
  onChange: (category: string | undefined) => void;
}

/** Etapa 12a: categorías dinámicas (GET /api/categories) — useCategoryCatalog
 * ya devuelve el fallback hardcodeado mientras la query está en vuelo o si
 * falla, así que acá no hace falta un estado de loading aparte. */
export function CategoryChips({ category, onChange }: CategoryChipsProps) {
  const { categories } = useCategoryCatalog();

  return (
    <div className="flex flex-col gap-2 px-4 pt-3.5">
      <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-4">
        <Tag className="h-3 w-3 text-primary" aria-hidden />
        Explorar por categoría
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
            !category ? "bg-primary text-primary-foreground" : "border border-border bg-card text-ink-2",
          )}
        >
          <LayoutGrid className="h-4 w-4" aria-hidden />
          Todos
        </button>

        {categories.map((c) => {
          const style = CATEGORY_STYLES[c.key] ?? DEFAULT_CATEGORY_STYLE;
          const Icon = style.icon;
          const on = category === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onChange(on ? undefined : c.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
                on ? "bg-primary text-primary-foreground" : "border border-border bg-card text-ink-2",
              )}
            >
              {c.emoji ? (
                <span aria-hidden>{c.emoji}</span>
              ) : (
                <Icon className="h-4 w-4" style={{ color: on ? "#fff" : (c.color ?? style.color) }} aria-hidden />
              )}
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
