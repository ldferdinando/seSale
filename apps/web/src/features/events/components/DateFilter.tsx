"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowRight,
  Calendar as CalendarIcon,
  CalendarPlus,
  CalendarRange,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { DATE_PRESETS, getDateRangeForPreset, type DatePreset } from "@/features/events/lib/dateRanges";
import type { EventFiltersState } from "@/features/events/types";
import { cn } from "@/lib/utils";

const PRESET_LABELS: Record<DatePreset, { label: string; icon: LucideIcon }> = {
  hoy: { label: "Esta noche", icon: Moon },
  manana: { label: "Mañana", icon: Sun },
  finde: { label: "Este finde", icon: CalendarRange },
  semana: { label: "Esta semana", icon: CalendarIcon },
  mes: { label: "Este mes", icon: CalendarIcon },
};

interface DateFilterProps {
  filters: EventFiltersState;
  onChange: (filters: EventFiltersState) => void;
}

export function DateFilter({ filters, onChange }: DateFilterProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();
  const [activePreset, setActivePreset] = useState<DatePreset | null>(null);

  function applyPreset(preset: DatePreset) {
    const range = getDateRangeForPreset(preset);
    setActivePreset(preset);
    setSelectedDay(undefined);
    setShowCalendar(false);
    onChange({ ...filters, ...range });
  }

  function clearDate() {
    setActivePreset(null);
    setSelectedDay(undefined);
    onChange({ ...filters, dateFrom: undefined, dateTo: undefined });
  }

  function applyCalendarDay() {
    if (!selectedDay) return;
    const iso = format(selectedDay, "yyyy-MM-dd");
    setActivePreset(null);
    onChange({ ...filters, dateFrom: iso, dateTo: iso });
    setShowCalendar(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-4">
        <CalendarIcon className="h-3 w-3 text-primary" aria-hidden />
        ¿Cuándo?
      </p>

      <div className="flex flex-wrap gap-2">
        {DATE_PRESETS.map((preset) => {
          const { label, icon: Icon } = PRESET_LABELS[preset];
          const on = activePreset === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => applyPreset(preset)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-colors",
                on ? "bg-primary text-primary-foreground" : "bg-surface-5 text-ink-1 hover:bg-surface-6",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setShowCalendar((s) => !s)}
          className={cn(
            "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-colors",
            showCalendar ? "bg-primary text-primary-foreground" : "bg-surface-5 text-ink-1 hover:bg-surface-6",
          )}
        >
          <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
          Elegir fecha
        </button>

        {(filters.dateFrom || filters.dateTo) && (
          <button
            type="button"
            onClick={clearDate}
            className="rounded-full bg-surface-5 px-3.5 py-2 text-xs font-semibold text-ink-3 hover:bg-surface-6"
          >
            Limpiar
          </button>
        )}
      </div>

      {showCalendar && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-1 p-3.5">
          <Calendar selected={selectedDay} onSelect={setSelectedDay} />
          {selectedDay && (
            <div className="flex items-center justify-between rounded-lg border border-primary bg-brand-pinkBg px-3.5 py-2.5">
              <span className="flex items-center gap-2 text-sm font-bold text-primary">
                <CalendarIcon className="h-4 w-4" aria-hidden />
                {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
              </span>
              <button
                type="button"
                onClick={applyCalendarDay}
                className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
              >
                Ver eventos
                <ArrowRight className="h-3 w-3" aria-hidden />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
