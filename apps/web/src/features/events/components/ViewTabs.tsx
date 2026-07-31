"use client";

import { LayoutList, Map } from "lucide-react";

import { cn } from "@/lib/utils";

export type EventView = "lista" | "mapa";

interface ViewTabsProps {
  value: EventView;
  onChange: (value: EventView) => void;
}

export function ViewTabs({ value, onChange }: ViewTabsProps) {
  return (
    <div className="flex border-b border-border bg-surface-1">
      <button
        type="button"
        onClick={() => onChange("lista")}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 border-b-2 py-3 text-xs font-semibold transition-colors",
          value === "lista" ? "border-primary text-primary" : "border-transparent text-ink-5",
        )}
      >
        <LayoutList className="h-3.5 w-3.5" aria-hidden />
        Grilla
      </button>
      <button
        type="button"
        onClick={() => onChange("mapa")}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 border-b-2 py-3 text-xs font-semibold transition-colors",
          value === "mapa" ? "border-primary text-primary" : "border-transparent text-ink-5",
        )}
      >
        <Map className="h-3.5 w-3.5" aria-hidden />
        Mapa
      </button>
    </div>
  );
}
