"use client";

import { useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

interface CalendarProps {
  selected?: Date;
  onSelect: (date: Date) => void;
}

export function Calendar({ selected, onSelect }: CalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(selected ?? new Date()));

  const gridStart = startOfWeek(startOfMonth(month));
  const gridEnd = endOfWeek(endOfMonth(month));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((m) => subMonths(m, 1))}
          aria-label="Mes anterior"
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-5 text-white hover:bg-primary"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <p className="flex items-center gap-1.5 text-sm font-bold capitalize text-foreground">
          {format(month, "MMMM yyyy", { locale: es })}
        </p>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          aria-label="Mes siguiente"
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-5 text-white hover:bg-primary"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} className="py-0.5 text-center text-[9px] font-bold text-ink-5">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const inMonth = isSameMonth(day, month);
          const selectedDay = selected && isSameDay(day, selected);
          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={!inMonth}
              onClick={() => onSelect(day)}
              className={cn(
                "flex h-8 items-center justify-center rounded-md text-xs font-semibold",
                !inMonth && "cursor-default text-surface-5",
                inMonth && !selectedDay && "text-ink-2 hover:bg-surface-5",
                inMonth && isToday(day) && !selectedDay && "font-extrabold text-primary",
                selectedDay && "bg-primary text-primary-foreground",
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
