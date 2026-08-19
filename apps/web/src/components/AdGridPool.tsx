"use client";

import { Megaphone } from "lucide-react";
import { useEffect, useState } from "react";

import type { AdItemPublic } from "@/features/ads/types";
import { resolveMediaUrl } from "@/lib/media";

/** Elige un par de índices distintos al azar dentro de [0, length). No repite
 * el mismo índice en ambas posiciones cuando length >= 2. */
export function pickPair(length: number): [number | null, number | null] {
  if (length <= 0) return [null, null];
  if (length === 1) return [0, null];
  const a = Math.floor(Math.random() * length);
  let b = a;
  while (b === a) {
    b = Math.floor(Math.random() * length);
  }
  return [a, b];
}

const TILE_CLASS = "relative aspect-square w-full overflow-hidden rounded-xl bg-surface-2 md:aspect-[6/5]";

function GridTile({ item }: { item: AdItemPublic | null }) {
  if (!item) {
    return (
      <div className={TILE_CLASS} data-testid="ad-grid-tile-empty">
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-surface-4 bg-surface-2 text-ink-5">
          <Megaphone className="h-5 w-5 text-brand-pink/40" aria-hidden />
          <span className="text-[10px] font-semibold">Espacio publicitario disponible</span>
        </div>
      </div>
    );
  }

  const image = (
    <img
      src={resolveMediaUrl(item.img_url) ?? item.img_url}
      alt={item.alt_text || "Publicidad"}
      className="h-full w-full object-cover"
    />
  );

  return (
    <div className={TILE_CLASS} data-testid="ad-grid-tile">
      {item.link_url ? (
        <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
          {image}
        </a>
      ) : (
        image
      )}
    </div>
  );
}

interface AdGridPoolProps {
  items: AdItemPublic[];
  rotationIntervalSeconds?: number;
  className?: string;
}

/**
 * Pool único de AdItems de section="eventos-grid": siempre muestra 2
 * columnas, eligiendo un par aleatorio distinto cada rotationIntervalSeconds
 * (nunca el mismo item en ambas columnas a la vez). Si el pool tiene menos de
 * 2 items, completa con placeholders. Usado tanto en el listado público
 * (AdSlotsGrid, ver features/events/components/AdSlots.tsx) como en la
 * preview del panel admin (AdGridPoolCard).
 */
export function AdGridPool({ items, rotationIntervalSeconds = 5, className }: AdGridPoolProps) {
  const [pair, setPair] = useState<[number | null, number | null]>(() => pickPair(items.length));

  useEffect(() => {
    setPair(pickPair(items.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => {
    if (items.length === 0) return;

    const intervalMs = Math.max(1, rotationIntervalSeconds) * 1000;
    const id = setInterval(() => {
      setPair(pickPair(items.length));
    }, intervalMs);

    return () => clearInterval(id);
  }, [items.length, rotationIntervalSeconds]);

  const [a, b] = pair;

  return (
    <div className={`grid grid-cols-2 gap-2.5 ${className ?? ""}`} data-testid="ad-grid-pool">
      <GridTile item={a !== null ? items[a] : null} />
      <GridTile item={b !== null ? items[b] : null} />
    </div>
  );
}
