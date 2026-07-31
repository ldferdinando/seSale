"use client";

import { useEventStats } from "@/features/events/hooks/useEventStats";

export function StatsBar() {
  const { eventsCount, citiesCount, isLoading } = useEventStats();

  return (
    <div className="mx-4 mb-6 flex gap-6 border-t border-border pt-4">
      <div>
        <span className="block text-xl font-extrabold tracking-tight text-foreground">
          {isLoading ? "—" : eventsCount}
        </span>
        <span className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-5">Eventos activos</span>
      </div>
      <div>
        {/* Organizadores: EventRead no expone organizer_id todavía — ver a_revisar.md */}
        <span className="block text-xl font-extrabold tracking-tight text-foreground">—</span>
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
