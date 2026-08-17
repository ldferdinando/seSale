"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays } from "lucide-react";

import { useEvents } from "@/features/events/hooks/useEvents";

interface TodayBannerProps {
  onClick: () => void;
}

/**
 * "¿Qué hay hoy?" (antes de las 20hs) vs. "Ahora" (20hs o más) — la hora se
 * calcula 100% en el cliente (Etapa 8b, PARTE A6), a diferencia del
 * diurno/nocturno del backend (que usa hora Argentina siempre, ver
 * ARCHITECTURE.md). De noche, el filtro que dispara el click pasa a ser
 * moment=nocturno de hoy (eventos en curso o próximos) en vez del rango de
 * fecha "hoy" completo.
 */
export function TodayBanner({ onClick }: TodayBannerProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  const isNight = new Date().getHours() >= 20;

  const { data } = useEvents(
    isNight ? { dateFrom: today, dateTo: today, moment: "nocturno" } : { dateFrom: today, dateTo: today },
  );
  const count = data?.length ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-4 mt-3.5 flex items-center gap-3 rounded-2xl bg-primary p-4 text-left"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/20">
        <CalendarDays className="h-5 w-5 text-white" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white">{isNight ? "Ahora" : "¿Qué hay hoy?"}</p>
        <p className="mt-0.5 truncate text-xs text-white/60">{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</p>
      </div>
      <span className="flex-shrink-0 whitespace-nowrap rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
        {count === 1 ? "1 plan" : `${count} planes`}
      </span>
    </button>
  );
}
