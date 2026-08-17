"use client";

import { Megaphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { AdSlot } from "@/features/ads/types";
import { resolveMediaUrl } from "@/lib/media";

interface BannerSlotProps {
  slot: AdSlot;
  className?: string;
}

/** Tamaño según sección — sigue .ban-full (wide) y .ad-tile (grid) de seSALE.html. */
const SECTION_ASPECT: Record<AdSlot["section"], string> = {
  eventos: "aspect-[3.2/1] md:aspect-[3.88/1]",
  gastronomia: "aspect-[3.2/1] md:aspect-[3.88/1]",
  "eventos-grid": "aspect-square md:aspect-[6/5]",
};

function EmptyBannerState() {
  return (
    <div
      data-testid="banner-slot-empty"
      className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-surface-4 bg-surface-2 text-ink-5"
    >
      <Megaphone className="h-5 w-5 text-brand-pink/40" aria-hidden />
      <span className="text-[10px] font-semibold">Espacio publicitario disponible</span>
    </div>
  );
}

/** Elige un índice random distinto del actual (o el único posible si len<=1). */
function nextRandomIndex(current: number, length: number): number {
  if (length <= 1) return 0;
  let next = current;
  while (next === current) {
    next = Math.floor(Math.random() * length);
  }
  return next;
}

/**
 * Renderiza un AdSlot: estado vacío (sin AdItem vigente) o la imagen actual
 * con rotación automática entre items — Etapa 8d. No hace fetch, recibe el
 * slot ya cargado (ver useBannerSlots, que sí hace el fetch en el padre).
 */
export function BannerSlot({ slot, className }: BannerSlotProps) {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);

  useEffect(() => {
    setIndex(0);
    indexRef.current = 0;
  }, [slot.id, slot.items.length]);

  useEffect(() => {
    if (slot.items.length <= 1) return;

    const intervalMs = Math.max(1, slot.rotation_interval_seconds) * 1000;
    const id = setInterval(() => {
      const length = slot.items.length;
      const nextIndex =
        slot.rotation_mode === "random"
          ? nextRandomIndex(indexRef.current, length)
          : (indexRef.current + 1) % length;
      indexRef.current = nextIndex;
      setIndex(nextIndex);
    }, intervalMs);

    return () => clearInterval(id);
  }, [slot.items.length, slot.rotation_interval_seconds, slot.rotation_mode]);

  const aspect = SECTION_ASPECT[slot.section];
  const wrapperClassName = `relative overflow-hidden rounded-xl bg-surface-2 ${aspect} ${className ?? ""}`;

  if (slot.items.length === 0) {
    return (
      <div className={wrapperClassName} data-testid="banner-slot">
        <EmptyBannerState />
      </div>
    );
  }

  const item = slot.items[index];
  const image = (
    <img
      src={resolveMediaUrl(item.img_url) ?? item.img_url}
      alt={item.alt_text || "Publicidad"}
      className="h-full w-full object-cover"
    />
  );

  return (
    <div className={wrapperClassName} data-testid="banner-slot">
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
