"use client";

import { ChevronUp, LayoutGrid, Tag } from "lucide-react";
import { useEffect, useState } from "react";

import { useCategoryCatalog } from "@/features/events/hooks/useCategoryCatalog";
import { CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE } from "@/features/events/lib/categoryStyles";
import type { EventFiltersState } from "@/features/events/types";
import { cn } from "@/lib/utils";

/** Categorías visibles con la lista colapsada (las primeras N en el orden
 * del catálogo: sort_order, después nombre — lo resuelve el backend). */
export const COLLAPSED_CATEGORY_COUNT = 6;

interface CategoryChipsProps {
  category?: EventFiltersState["category"];
  onChange: (category: string | undefined) => void;
}

/** Etapa 12a: categorías dinámicas (GET /api/categories) — useCategoryCatalog
 * ya devuelve el fallback hardcodeado mientras la query está en vuelo o si
 * falla, así que acá no hace falta un estado de loading aparte. */
export function CategoryChips({ category, onChange }: CategoryChipsProps) {
  const { categories } = useCategoryCatalog();
  const [expanded, setExpanded] = useState(false);

  // Si la categoría elegida queda fuera de las primeras N (p. ej. filtros
  // restaurados al volver desde un evento), se expande para que se vea.
  const activeIndex = category ? categories.findIndex((c) => c.key === category) : -1;
  useEffect(() => {
    if (activeIndex >= COLLAPSED_CATEGORY_COUNT) setExpanded(true);
  }, [activeIndex]);

  const hiddenCount = Math.max(categories.length - COLLAPSED_CATEGORY_COUNT, 0);
  const visibleCategories = expanded ? categories : categories.slice(0, COLLAPSED_CATEGORY_COUNT);

  return (
    <div className="flex flex-col gap-1.5">
      <p className="flex items-center gap-1.5 border-l-[3px] border-brand-pink pl-[10px] text-[13px] font-bold uppercase tracking-[1.6px] text-brand-lime">
        <Tag className="h-3.5 w-3.5 text-primary" aria-hidden />
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

        {visibleCategories.map((c) => {
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

        {/* "+N más" / "Ver menos": mismo chip que las categorías pero
            punteado, para que se lea como acción y no como filtro. */}
        {hiddenCount > 0 && (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1.5 rounded-full border border-dashed border-primary/60 bg-transparent px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" aria-hidden />
                Ver menos
              </>
            ) : (
              `+${hiddenCount} más`
            )}
          </button>
        )}
      </div>
    </div>
  );
}
