"use client";

import { Megaphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyBanners } from "@/features/ads/hooks/useMyBanners";
import { AD_SECTION_LABELS, type MyAdItem } from "@/features/ads/types";
import { sesaleWhatsappHref } from "@/features/plans/lib/whatsapp";
import { resolveMediaUrl } from "@/lib/media";

const STATUS_LABEL: Record<MyAdItem["status"], string> = {
  active: "Activo",
  paused: "Pausado",
  expired: "Vencido",
};

const STATUS_VARIANT: Record<MyAdItem["status"], "default" | "muted" | "pro"> = {
  active: "pro",
  paused: "muted",
  expired: "muted",
};

function MyBannerRow({ item }: { item: MyAdItem }) {
  return (
    <div data-testid="my-banner-row" className="flex items-center gap-3 rounded-lg border border-border p-3">
      <img
        src={resolveMediaUrl(item.img_url) ?? item.img_url}
        alt=""
        className="h-14 w-20 shrink-0 rounded-md object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">
          {AD_SECTION_LABELS[item.section]} · Carrusel {item.slot_position + 1}
        </p>
        <p className="text-xs text-ink-4">
          {item.starts_at} → {item.ends_at ?? "Sin fecha de vencimiento"}
        </p>
        <Badge variant={STATUS_VARIANT[item.status]} className="mt-1">
          {STATUS_LABEL[item.status]}
        </Badge>
      </div>
    </div>
  );
}

/** "Mis banners" en /mi-cuenta — solo lectura, Etapa 8d PARTE 9. */
export function MyBannersSection() {
  const { data: banners, isLoading } = useMyBanners();

  if (isLoading) {
    return (
      <div data-testid="my-banners-loading" className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!banners || banners.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-surface-4 bg-surface-2 px-6 py-8 text-center">
        <Megaphone className="h-6 w-6 text-ink-5" aria-hidden />
        <p className="text-sm text-ink-3">No tenés banners activos.</p>
        <a
          href={sesaleWhatsappHref("Hola! Quiero consultar por publicitar en seSALE.")}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-primary"
        >
          Contactanos para publicitar en seSALE
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {banners.map((item) => (
        <MyBannerRow key={item.id} item={item} />
      ))}
    </div>
  );
}
