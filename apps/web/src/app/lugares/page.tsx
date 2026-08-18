"use client";

import { ArrowLeft, Search, Store } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { BannerSlot } from "@/components/BannerSlot";
import { Skeleton } from "@/components/ui/skeleton";
import { GastroPlaceCard } from "@/features/gastro/components/GastroPlaceCard";
import { GastroTypeChips } from "@/features/gastro/components/GastroTypeChips";
import { useActiveCity } from "@/hooks/useActiveCity";
import { useBannerSlots } from "@/hooks/useBannerSlots";
import { useGastroPlaces } from "@/hooks/useGastroPlaces";

const SEARCH_DEBOUNCE_MS = 300;

/** Sección Gastronomía y otros — Etapa 8e. Reemplaza el placeholder de la
 * Etapa 8b (a_revisar.md). Ver #s-lugares en seSALE.html. */
export default function LugaresPage() {
  const { activeCity } = useActiveCity();
  const { slots, isLoading: isLoadingBanners } = useBannerSlots({
    cityId: activeCity?.id ?? null,
    section: "gastronomia",
  });

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [gastroType, setGastroType] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [search]);

  const { places, isLoading: isLoadingPlaces } = useGastroPlaces({
    cityId: activeCity?.id ?? null,
    gastroType,
    search: debouncedSearch,
  });

  return (
    <main className="flex flex-col gap-4 pb-6">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 text-ink-3">
        <Link href="/" className="flex items-center gap-3">
          <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
        </Link>
        <span className="text-sm font-medium">Gastronomía y otros</span>
      </header>

      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 mx-4">
        <Search className="h-4 w-4 flex-shrink-0 text-ink-4" aria-hidden />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar restaurante, bar, cervecería..."
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-ink-5"
          data-testid="gastro-search-input"
        />
      </div>

      <GastroTypeChips gastroType={gastroType} onChange={setGastroType} />

      <div className="flex flex-col gap-2 px-4">
        {isLoadingBanners ? (
          <div className="flex flex-col gap-2" data-testid="gastronomia-banners-loading">
            <Skeleton className="aspect-[3.2/1] w-full rounded-xl md:aspect-[3.88/1]" />
            <Skeleton className="aspect-[3.2/1] w-full rounded-xl md:aspect-[3.88/1]" />
            <Skeleton className="aspect-[3.2/1] w-full rounded-xl md:aspect-[3.88/1]" />
          </div>
        ) : (
          slots.map((slot) => <BannerSlot key={slot.id} slot={slot} />)
        )}
      </div>

      <div className="flex flex-col gap-2 px-4">
        {isLoadingPlaces ? (
          <div className="flex flex-col gap-2" data-testid="gastro-places-loading">
            <Skeleton className="h-[92px] w-full rounded-xl" />
            <Skeleton className="h-[92px] w-full rounded-xl" />
            <Skeleton className="h-[92px] w-full rounded-xl" />
          </div>
        ) : places.length === 0 ? (
          <div className="mx-0 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-4 bg-surface-2 px-6 py-16 text-center">
            <Store className="h-9 w-9 text-ink-5" aria-hidden />
            <p className="text-sm font-bold text-ink-3">No hay lugares en esta categoría todavía</p>
          </div>
        ) : (
          places.map((place) => <GastroPlaceCard key={place.id} place={place} />)
        )}
      </div>
    </main>
  );
}
