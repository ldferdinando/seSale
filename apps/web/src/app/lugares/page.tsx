"use client";

import { ArrowLeft, Building2, Info, Megaphone, Search, Store, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { BannerSlot } from "@/components/BannerSlot";
import { Skeleton } from "@/components/ui/skeleton";
import { GastroPlaceCard } from "@/features/gastro/components/GastroPlaceCard";
import { GastroTypeChips } from "@/features/gastro/components/GastroTypeChips";
import { useGastroTypeCatalog } from "@/features/gastro/hooks/useGastroTypeCatalog";
import type { GastroTypeGrupo } from "@/features/gastro/types";
import { useActiveCity } from "@/hooks/useActiveCity";
import { useBannerSlots } from "@/hooks/useBannerSlots";
import { useGastroPlaces } from "@/hooks/useGastroPlaces";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 300;

const GRUPOS: { value: GastroTypeGrupo; label: string; icon: typeof UtensilsCrossed }[] = [
  { value: "gastro", label: "Gastronomía", icon: UtensilsCrossed },
  { value: "espacios", label: "Espacios", icon: Building2 },
];

/** Sección Gastronomía y otros — Etapa 8e. Reemplaza el placeholder de la
 * Etapa 8b (a_revisar.md). Ver #s-lugares en seSALE.html. Etapa "Gastronomía
 * y otros": suma el selector de grupo Gastronomía | Espacios (setGrupoLug en
 * seSALE.html). */
export default function LugaresPage() {
  const { activeCity } = useActiveCity();
  const { slots, isLoading: isLoadingBannersQuery } = useBannerSlots({
    cityId: activeCity?.id ?? null,
    section: "gastronomia",
  });
  // Bug reportado (Parte 3): el placeholder "Espacio publicitario
  // disponible" se veía un instante y desaparecía. Causa: `useBannerSlots`
  // solo se `enabled` con `cityId`, así que mientras la ciudad activa
  // todavía no resolvió (`activeCity` null, ver ActiveCityContext) la
  // query queda deshabilitada e `isLoading` da `false` — con `slots` en su
  // valor por defecto `[]`, el bloque de banners no renderizaba ni skeleton
  // ni placeholder (nada), y recién al terminar la detección pasaba a
  // mostrar el skeleton y después sí el placeholder — ese primer instante
  // en blanco, seguido de contenido que aparece, es lo que se percibía
  // como el placeholder "apareciendo y desapareciendo" en cargas rápidas.
  // Fix: mientras no hay ciudad activa también se considera "cargando", así
  // el skeleton se muestra desde el primer render y el placeholder queda
  // fijo apenas hay datos, sin ningún estado intermedio en blanco.
  const isLoadingBanners = !activeCity || isLoadingBannersQuery;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [grupo, setGrupo] = useState<GastroTypeGrupo>("gastro");
  const [gastroType, setGastroType] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [search]);

  const { places: allPlaces, isLoading: isLoadingPlacesQuery } = useGastroPlaces({
    cityId: activeCity?.id ?? null,
    gastroType,
    search: debouncedSearch,
  });
  const isLoadingPlaces = !activeCity || isLoadingPlacesQuery;

  // Con "Todos" (gastroType null) el fetch trae lugares de ambos grupos —
  // se filtran acá por el grupo activo (mismo criterio que TIPO_GRUPO/
  // setGrupoLug en seSALE.html). Con un tipo puntual elegido, el filtro del
  // backend ya alcanza (un tipo pertenece a un solo grupo).
  const { types: allTypes } = useGastroTypeCatalog();
  const grupoTypeKeys = useMemo(
    () => new Set(allTypes.filter((t) => t.grupo === grupo).map((t) => t.key)),
    [allTypes, grupo],
  );
  const places =
    gastroType !== null
      ? allPlaces
      : allPlaces.filter((place) => place.gastro_types.some((key) => grupoTypeKeys.has(key)));

  function handleGrupoChange(next: GastroTypeGrupo) {
    setGrupo(next);
    setGastroType(null);
  }

  // Etapa "Cambios de diseño TIPO B v2.2" (punto 11): con "Todos" (sin
  // filtro de tipo) los banners van antes del listado, igual que hasta
  // ahora; al elegir un tipo específico se reposicionan después de los
  // resultados y se hace scroll suave hacia el listado, para que el
  // usuario vea primero los lugares filtrados que pidió.
  const resultsRef = useRef<HTMLDivElement>(null);
  // Etapa "Ajustes de diseño reportados" (Parte 3): faltaba el label
  // "Publicidad" (análogo de `.ban-lbl` en #s-lugares de seSALE_v2.html),
  // ya presente en el mismo bloque de Home (ver AdSlots.tsx) pero ausente
  // acá — mismo patrón de clases, sin inventar valores nuevos.
  const bannersLabel = (
    <span className="flex items-center gap-1 border-l-[3px] border-brand-pink pl-[10px] text-[13px] font-bold uppercase tracking-[1.6px] text-brand-lime">
      <Megaphone className="h-3.5 w-3.5 text-primary" aria-hidden />
      Publicidad
    </span>
  );
  const bannersBlock = isLoadingBanners ? (
    <div className="flex flex-col gap-2" data-testid="gastronomia-banners-loading">
      <Skeleton className="aspect-[3.2/1] w-full rounded-xl md:aspect-[3.88/1]" />
      <Skeleton className="aspect-[3.2/1] w-full rounded-xl md:aspect-[3.88/1]" />
      <Skeleton className="aspect-[3.2/1] w-full rounded-xl md:aspect-[3.88/1]" />
    </div>
  ) : (
    slots.map((slot) => <BannerSlot key={slot.id} slot={slot} />)
  );

  function handleGastroTypeChange(type: string | null) {
    setGastroType(type);
    if (type !== null) {
      // setTimeout(0) en vez de hacer el scroll en el mismo tick: espera a
      // que React termine de reposicionar el bloque de resultados (el
      // banner deja de estar arriba) antes de scrollear hacia él.
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
  }

  return (
    <main className="flex flex-col gap-4 pb-6">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 text-ink-3">
        <Link href="/" className="flex items-center gap-3">
          <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
        </Link>
        <span className="text-sm font-medium">Gastronomía y otros</span>
      </header>

      {/* Selector de grupo — Gastronomía | Espacios (.lug-grupos en seSALE.html). */}
      <div className="mx-4 flex gap-3" data-testid="lugares-grupo-selector">
        {GRUPOS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => handleGrupoChange(value)}
            aria-pressed={grupo === value}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-extrabold",
              grupo === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-ink-2",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {/* Etapa "Ajustes de diseño reportados" (Parte 3): rounded-full→
          rounded-lg + ícono ink-4→ink-5, para calzar con `.sbar` de
          seSALE_v2.html y con la barra de búsqueda de Home (EventFilters.tsx),
          que ya usa exactamente este mismo patrón. */}
      <div className="mx-4 flex items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2.5">
        <Search className="h-4 w-4 flex-shrink-0 text-ink-5" aria-hidden />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar restaurante, bar, cervecería..."
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-ink-5"
          data-testid="gastro-search-input"
        />
      </div>

      <GastroTypeChips grupo={grupo} gastroType={gastroType} onChange={handleGastroTypeChange} />

      {/* "Todos" (gastroType === null): banners antes de los resultados. */}
      {gastroType === null && (
        <div className="flex flex-col gap-2 px-4">
          {bannersLabel}
          {bannersBlock}
        </div>
      )}

      <div ref={resultsRef} className="flex flex-col gap-2 px-4 scroll-mt-4">
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

      {/* Con un tipo específico elegido: banners después de los resultados
          (punto 11 — reposicionamiento dinámico de banners al filtrar). */}
      {gastroType !== null && (
        <div className="flex flex-col gap-2 px-4">
          {bannersLabel}
          {bannersBlock}
        </div>
      )}

      {/* Copy calcado de `.no-deliv` en seSALE.html — Etapa 10b-1. Etapa
          "Ajustes de diseño reportados" (Parte 3): color de texto ink-4→
          ink-5 (la referencia usa var(--t5) para `.no-deliv`, no --t4). */}
      <div className="mx-4 flex items-start gap-2 rounded-xl bg-surface-1 p-3 text-[11px] leading-relaxed text-ink-5">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden />
        <span>
          Solo lugares para salir — bares, restaurantes, cafés, clubes, centros culturales y salones de eventos. Sin
          delivery, sin clases, sin servicios.
        </span>
      </div>
    </main>
  );
}
