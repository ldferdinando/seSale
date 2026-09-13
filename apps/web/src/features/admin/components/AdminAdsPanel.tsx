"use client";

import { useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCities } from "@/features/auth/hooks/useCities";
import { useAdminAdSlots } from "@/features/ads/hooks/useAdminAds";
import { AdSlotCard } from "@/features/ads/components/AdSlotCard";
import { AdGridPoolCard } from "@/features/ads/components/AdGridPoolCard";
import { AD_SECTION_LABELS, type AdSection } from "@/features/ads/types";
import { useCategoryCatalog } from "@/features/events/hooks/useCategoryCatalog";

const SECTIONS: AdSection[] = ["eventos", "eventos-grid", "gastronomia", "categoria-wide", "categoria-grid"];
const CATEGORY_SECTIONS: AdSection[] = ["categoria-wide", "categoria-grid"];
const ALL_CATEGORIES_VALUE = "__all__";

/** Panel admin de Banners — Etapa 8d, PARTE 8a/8b; selector de categoría
 * para categoria-wide/categoria-grid — Etapa 13b, PARTE 5. */
export function AdminAdsPanel() {
  const { data: cities } = useCities();
  const { categories } = useCategoryCatalog();
  const [cityId, setCityId] = useState<string>("");
  const [section, setSection] = useState<AdSection>("eventos");
  const [categoryKey, setCategoryKey] = useState<string | null>(null);

  const isCategorySection = CATEGORY_SECTIONS.includes(section);
  const { data: slots, isLoading, isError } = useAdminAdSlots(
    cityId || undefined,
    section,
    isCategorySection ? categoryKey : undefined,
  );

  function handleSectionChange(value: AdSection) {
    setSection(value);
    if (!CATEGORY_SECTIONS.includes(value)) setCategoryKey(null);
  }

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

        <Select value={section} onValueChange={(v) => handleSectionChange(v as AdSection)}>
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

        {isCategorySection && (
          <Select value={categoryKey ?? ALL_CATEGORIES_VALUE} onValueChange={(v) => setCategoryKey(v === ALL_CATEGORIES_VALUE ? null : v)}>
            <SelectTrigger aria-label="Categoría" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES_VALUE}>Todas las categorías</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.emoji ? `${c.emoji} ` : ""}
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isCategorySection && categoryKey === null && (
        <p className="text-xs text-muted-foreground">
          Estos banners aparecen en la página principal de Categorías (/categorias).
        </p>
      )}

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
          {section === "eventos-grid" || section === "categoria-grid" ? (
            slots.length > 0 && <AdGridPoolCard slots={slots} />
          ) : (
            slots
              .sort((a, b) => a.slot_position - b.slot_position)
              .map((slot) => <AdSlotCard key={slot.id} slot={slot} />)
          )}
        </div>
      )}
    </section>
  );
}
