"use client";

import { Moon, Sun } from "lucide-react";

import type { EventMoment } from "@/features/events/types";
import { cn } from "@/lib/utils";

interface MomentPillsProps {
  value?: EventMoment;
  onChange: (value: EventMoment | undefined) => void;
}

export function MomentPills({ value, onChange }: MomentPillsProps) {
  return (
    <div className="flex flex-col gap-1.5 px-4 pt-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(value === "dia" ? undefined : "dia")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition-colors",
            value === "dia" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-ink-2",
          )}
        >
          <Sun className="h-3.5 w-3.5" aria-hidden />
          De día
        </button>
        <button
          type="button"
          onClick={() => onChange(value === "noche" ? undefined : "noche")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition-colors",
            value === "noche" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-ink-2",
          )}
        >
          <Moon className="h-3.5 w-3.5" aria-hidden />
          De noche
        </button>
      </div>
      <p className="text-center text-[9px] text-ink-5">
        Día 07:00–19:59 hs · Noche 20:00–06:59 hs
      </p>
    </div>
  );
}
