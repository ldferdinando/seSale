"use client";

import { useEventStats } from "@/features/events/hooks/useEventStats";

export function StatsBar() {
  const { eventsCount, organizersCount, citiesCount, isLoading } = useEventStats();

  return (
    <div className="mx-4 mb-6 flex gap-6 border-t border-border pt-4">
      <div>
        <span className="block text-xl font-extrabold tracking-tight text-foreground">
          {isLoading ? "—" : eventsCount}
        </span>
        <span className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-5">Eventos activos</span>
      </div>
      <div>
        <span className="block text-xl font-extrabold tracking-tight text-foreground">
          {isLoading ? "—" : organizersCount}
        </span>
        <span className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-5">Organizadores</span>
      </div>
      <div>
        <span className="block text-xl font-extrabold tracking-tight text-foreground">
          {isLoading ? "—" : citiesCount}
        </span>
        <span className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-5">Ciudades</span>
      </div>
    </div>
  );
}
