import { addDays, endOfMonth, endOfWeek, format, nextSaturday, nextSunday, startOfDay } from "date-fns";

const toIso = (d: Date) => format(d, "yyyy-MM-dd");

export interface DateRange {
  dateFrom: string;
  dateTo: string;
}

function weekendRange(today: Date): DateRange {
  const day = today.getDay();
  if (day === 6) return { dateFrom: toIso(today), dateTo: toIso(addDays(today, 1)) };
  if (day === 0) return { dateFrom: toIso(today), dateTo: toIso(today) };
  return { dateFrom: toIso(nextSaturday(today)), dateTo: toIso(nextSunday(today)) };
}

export const DATE_PRESETS = ["hoy", "manana", "finde", "semana", "mes"] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

export function getDateRangeForPreset(preset: DatePreset, today: Date = startOfDay(new Date())): DateRange {
  switch (preset) {
    case "hoy":
      return { dateFrom: toIso(today), dateTo: toIso(today) };
    case "manana": {
      const tomorrow = addDays(today, 1);
      return { dateFrom: toIso(tomorrow), dateTo: toIso(tomorrow) };
    }
    case "finde":
      return weekendRange(today);
    case "semana":
      return { dateFrom: toIso(today), dateTo: toIso(endOfWeek(today, { weekStartsOn: 1 })) };
    case "mes":
      return { dateFrom: toIso(today), dateTo: toIso(endOfMonth(today)) };
  }
}
