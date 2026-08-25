"use client";

import { Megaphone } from "lucide-react";
import { useMemo } from "react";

import { AdGridPool } from "@/components/AdGridPool";
import { BannerSlot } from "@/components/BannerSlot";
import { Skeleton } from "@/components/ui/skeleton";
import { useBannerSlots } from "@/hooks/useBannerSlots";
import { useActiveCity } from "@/hooks/useActiveCity";

/** Etapa 8d — los 3 carruseles wide de la sección "eventos" (antes:
 * placeholders estáticos, ver a_revisar.md Etapa 8d-pre). Van arriba del
 * listado de eventos. Los tiles cuadrados ("eventos-grid") van DESPUÉS del
 * listado — ver AdSlotsGrid más abajo, usado aparte en app/page.tsx
 * (feedback de QA manual: quedaban pegados a los carruseles). */
export function AdSlots() {
  const { activeCity } = useActiveCity();
  const cityId = activeCity?.id ?? null;

  const wide = useBannerSlots({ cityId, section: "eventos" });

  return (
    <div className="px-4 pt-3.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-5">
          <Megaphone className="h-2.5 w-2.5 text-primary" aria-hidden />
          Publicidad
        </span>
      </div>

      {wide.isLoading ? (
        <div className="flex flex-col gap-2" data-testid="ad-slots-wide-loading">
          <Skeleton className="aspect-[3.2/1] w-full rounded-xl md:aspect-[3.88/1]" />
          <Skeleton className="aspect-[3.2/1] w-full rounded-xl md:aspect-[3.88/1]" />
          <Skeleton className="aspect-[3.2/1] w-full rounded-xl md:aspect-[3.88/1]" />
        </div>
      ) : (
        wide.slots.map((slot) => <BannerSlot key={slot.id} slot={slot} className="mb-2" />)
      )}
    </div>
  );
}

/** Tiles cuadrados de la sección "eventos-grid" — van después del listado de
 * eventos (feedback de QA manual, Etapa 8d). Todos los AdItems de TODOS los
 * slots de "eventos-grid" (puede haber más de uno en la DB, ver seed.py)
 * forman un pool único; siempre se muestran 2 al azar, rotando el par cada
 * rotation_interval_seconds — ver AdGridPool. */
export function AdSlotsGrid() {
  const { activeCity } = useActiveCity();
  const cityId = activeCity?.id ?? null;

  const grid = useBannerSlots({ cityId, section: "eventos-grid" });

  const pool = useMemo(() => grid.slots.flatMap((slot) => slot.items), [grid.slots]);
  const rotationIntervalSeconds = grid.slots[0]?.rotation_interval_seconds ?? 5;

  return (
    <div className="pt-4 pb-3.5">
      {grid.isLoading ? (
        <div className="grid grid-cols-2 gap-2.5" data-testid="ad-slots-grid-loading">
          <Skeleton className="aspect-square w-full rounded-xl md:aspect-[6/5]" />
          <Skeleton className="aspect-square w-full rounded-xl md:aspect-[6/5]" />
        </div>
      ) : (
        <AdGridPool items={pool} rotationIntervalSeconds={rotationIntervalSeconds} />
      )}
    </div>
  );
}
