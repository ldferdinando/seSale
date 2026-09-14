"use client";

import { ArrowLeft, Search, SearchX } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { BannerSlot } from "@/components/BannerSlot";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategoryCatalog } from "@/features/events/hooks/useCategoryCatalog";
import { useCategoryCounts } from "@/features/events/hooks/useCategoryCounts";
import { CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE } from "@/features/events/lib/categoryStyles";
import { useActiveCity } from "@/hooks/useActiveCity";
import { useBannerSlots } from "@/hooks/useBannerSlots";

/** Compara sin distinguir mayúsculas/acentos — "musica" encuentra "Música". */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Etapa 13a — grilla de categorías activas en orden alfabético. Cada card
 * lleva a /categorias/{key} (eventos de esa categoría). Ver #s-categorias en
 * seSALE.html (`.cats-grid`/`.ccat`).
 * Etapa 13b — 2 banners wide generales (BANS_CATEGORIAS en seSALE.html)
 * arriba del grid, mismo patrón que AdSlots.tsx del home: si no hay
 * AdItem vigente se muestra el placeholder (a diferencia de
 * /categorias/{key}, donde los banners específicos de una categoría NO
 * muestran placeholder — ver CategoriaDetalleContent.tsx). */
export function CategoriasContent() {
  const { categories } = useCategoryCatalog();
  const { activeCity } = useActiveCity();
  const { counts, isLoading: isLoadingCounts } = useCategoryCounts(activeCity?.id);
  const wideBanners = useBannerSlots({ cityId: activeCity?.id ?? null, section: "categoria-wide" });
  const [search, setSearch] = useState("");

  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [categories],
  );

  // Etapa "Cambios de diseño TIPO B v2.2" (punto 7): buscador en vivo
  // (oninput, sin debounce ni pedido al backend — son a lo sumo unas
  // decenas de categorías ya cargadas en memoria por useCategoryCatalog).
  const filtered = useMemo(() => {
    const query = normalize(search.trim());
    if (!query) return sorted;
    return sorted.filter((category) => normalize(category.name).includes(query));
  }, [sorted, search]);

  return (
    <main className="flex flex-col gap-4 pb-6">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 text-ink-3">
        <Link href="/" className="flex items-center gap-3">
          <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
        </Link>
        <div>
          <h1 className="text-sm font-bold text-foreground">Categorías</h1>
          <p className="text-xs text-ink-4">Explorá los eventos por tipo</p>
        </div>
      </header>

      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 mx-4">
        <Search className="h-4 w-4 flex-shrink-0 text-ink-4" aria-hidden />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar categoría..."
          aria-label="Buscar categoría"
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-ink-5"
          data-testid="categorias-search-input"
        />
      </div>

      <div className="flex flex-col gap-2 px-4">
        {wideBanners.isLoading ? (
          <div className="flex flex-col gap-2" data-testid="categoria-bans-loading">
            <Skeleton className="aspect-[3.2/1] w-full rounded-xl md:aspect-[3.88/1]" />
            <Skeleton className="aspect-[3.2/1] w-full rounded-xl md:aspect-[3.88/1]" />
          </div>
        ) : (
          wideBanners.slots.map((slot) => <BannerSlot key={slot.id} slot={slot} />)
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="mx-4 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-4 bg-surface-2 px-6 py-16 text-center">
          <SearchX className="h-9 w-9 text-ink-5" aria-hidden />
          <p className="text-sm font-bold text-ink-3">Sin resultados para tu búsqueda</p>
        </div>
      ) : (
      <div className="grid grid-cols-2 gap-3 px-4">
        {filtered.map((category) => {
          const style = CATEGORY_STYLES[category.key] ?? DEFAULT_CATEGORY_STYLE;
          const Icon = style.icon;
          const count = counts[category.key] ?? 0;

          return (
            <Link
              key={category.key}
              href={`/categorias/${category.key}`}
              data-testid="categoria-card"
              className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-3.5 transition-colors hover:border-primary/60"
            >
              <span className="flex h-9 w-9 items-center justify-center text-2xl" aria-hidden>
                {category.emoji ? (
                  category.emoji
                ) : (
                  <Icon
                    className="h-6 w-6"
                    style={{ color: category.color ?? style.color }}
                  />
                )}
              </span>
              <h3 className="text-sm font-bold text-foreground">{category.name}</h3>
              <span className="text-xs text-ink-4">
                {isLoadingCounts
                  ? "…"
                  : count > 0
                    ? `${count} ${count === 1 ? "evento" : "eventos"}`
                    : "Sin eventos activos"}
              </span>
            </Link>
          );
        })}
      </div>
      )}
    </main>
  );
}
