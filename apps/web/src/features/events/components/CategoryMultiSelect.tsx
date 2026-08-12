"use client";

import { CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE } from "@/features/events/lib/categoryStyles";
import { EVENT_CATEGORIES, MAX_EVENT_CATEGORIES } from "@/features/events/types";
import { cn } from "@/lib/utils";

interface CategoryMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
}

/** Checkboxes de categoría — hasta MAX_EVENT_CATEGORIES seleccionadas a la vez. */
export function CategoryMultiSelect({ value, onChange }: CategoryMultiSelectProps) {
  const limitReached = value.length >= MAX_EVENT_CATEGORIES;

  function toggle(category: string) {
    if (value.includes(category)) {
      onChange(value.filter((c) => c !== category));
      return;
    }
    if (limitReached) return;
    onChange([...value, category]);
  }

  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Categorías">
      {EVENT_CATEGORIES.map((c) => {
        const style = CATEGORY_STYLES[c.value] ?? DEFAULT_CATEGORY_STYLE;
        const Icon = style.icon;
        const checked = value.includes(c.value);
        const disabled = !checked && limitReached;

        return (
          <label
            key={c.value}
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
              onChange={() => toggle(c.value)}
              className="h-4 w-4 accent-primary"
            />
            <Icon className="h-3.5 w-3.5" style={{ color: style.color }} aria-hidden />
            {c.label}
          </label>
        );
      })}
    </div>
  );
}
