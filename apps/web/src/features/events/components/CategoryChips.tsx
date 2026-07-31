"use client";

import { LayoutGrid, Tag } from "lucide-react";

import { CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE } from "@/features/events/lib/categoryStyles";
import { EVENT_CATEGORIES, type EventFiltersState } from "@/features/events/types";
import { cn } from "@/lib/utils";

interface CategoryChipsProps {
  category?: EventFiltersState["category"];
  onChange: (category: string | undefined) => void;
}

export function CategoryChips({ category, onChange }: CategoryChipsProps) {
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

        {EVENT_CATEGORIES.map((c) => {
          const style = CATEGORY_STYLES[c.value] ?? DEFAULT_CATEGORY_STYLE;
          const Icon = style.icon;
          const on = category === c.value;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => onChange(on ? undefined : c.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
                on ? "bg-primary text-primary-foreground" : "border border-border bg-card text-ink-2",
              )}
            >
              <Icon className="h-4 w-4" style={{ color: on ? "#fff" : style.color }} aria-hidden />
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
