"use client";

import { useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCities } from "@/features/auth/hooks/useCities";
import { useAdminAdSlots } from "@/features/ads/hooks/useAdminAds";
import { AdSlotCard } from "@/features/ads/components/AdSlotCard";
import { AD_SECTION_LABELS, type AdSection } from "@/features/ads/types";

const SECTIONS: AdSection[] = ["eventos", "eventos-grid", "gastronomia"];

/** Panel admin de Banners — Etapa 8d, PARTE 8a/8b. */
export function AdminAdsPanel() {
  const { data: cities } = useCities();
  const [cityId, setCityId] = useState<string>("");
  const [section, setSection] = useState<AdSection>("eventos");

  const { data: slots, isLoading, isError } = useAdminAdSlots(cityId || undefined, section);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-lg font-bold text-foreground">Banners</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={cityId || undefined} onValueChange={setCityId}>
          <SelectTrigger aria-label="Ciudad" className="w-44">
            <SelectValue placeholder="Elegí una ciudad" />
          </SelectTrigger>
          <SelectContent>
            {(cities ?? [])
              .filter((c) => c.is_active)
              .map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Select value={section} onValueChange={(v) => setSection(v as AdSection)}>
          <SelectTrigger aria-label="Sección" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SECTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {AD_SECTION_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!cityId && <p className="text-sm text-muted-foreground">Elegí una ciudad para ver sus banners.</p>}

      {cityId && isLoading && (
        <div data-testid="admin-ads-loading" className="flex flex-col gap-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {cityId && isError && (
        <p role="alert" className="text-sm text-muted-foreground">
          No pudimos cargar los banners. Intentá de nuevo más tarde.
        </p>
      )}

      {cityId && slots && (
        <div className="flex flex-col gap-4">
          {slots
            .sort((a, b) => a.slot_position - b.slot_position)
            .map((slot) => (
              <AdSlotCard key={slot.id} slot={slot} />
            ))}
        </div>
      )}
    </section>
  );
}
