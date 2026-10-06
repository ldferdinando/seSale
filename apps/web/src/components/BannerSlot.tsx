"use client";

import { Megaphone } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { AdSlot } from "@/features/ads/types";
import { isOptimizableMediaUrl, resolveMediaUrl } from "@/lib/media";

interface BannerSlotProps {
  slot: AdSlot;
  className?: string;
}

/** `sizes` de next/image según sección: los wide ocupan la columna entera
 * (container max-w-2xl = 672px), los grid la mitad. */
const SECTION_SIZES: Record<AdSlot["section"], string> = {
  eventos: "(max-width: 672px) 100vw, 672px",
  gastronomia: "(max-width: 672px) 100vw, 672px",
  "categoria-wide": "(max-width: 672px) 100vw, 672px",
  "eventos-grid": "(max-width: 672px) 50vw, 336px",
  "categoria-grid": "(max-width: 672px) 50vw, 336px",
};

/** Tamaño según sección — sigue .ban-full (wide) y .ad-tile (grid) de seSALE.html. */
const SECTION_ASPECT: Record<AdSlot["section"], string> = {
  eventos: "aspect-[3.2/1] md:aspect-[3.88/1]",
  gastronomia: "aspect-[3.2/1] md:aspect-[3.88/1]",
  "categoria-wide": "aspect-[3.2/1] md:aspect-[3.88/1]",
  "eventos-grid": "aspect-square md:aspect-[6/5]",
  "categoria-grid": "aspect-square md:aspect-[6/5]",
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
  const src = resolveMediaUrl(item.img_url) ?? item.img_url;
  // P0-4 — next/image con `fill`: el wrapper ya reserva el aspect-ratio de
  // la sección. Banners con URL externa o GIF van `unoptimized` (ver
  // isOptimizableMediaUrl).
  const image = (
    <Image
      src={src}
      alt={item.alt_text || "Publicidad"}
      fill
      sizes={SECTION_SIZES[slot.section]}
      unoptimized={!isOptimizableMediaUrl(src)}
      className="object-cover"
    />
  );

  return (
    <div className={wrapperClassName} data-testid="banner-slot">
      {item.link_url ? (
        <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="relative block h-full w-full">
          {image}
        </a>
      ) : (
        image
      )}
    </div>
  );
}
