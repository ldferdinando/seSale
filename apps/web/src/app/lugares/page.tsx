"use client";

import { ArrowLeft, Store } from "lucide-react";
import Link from "next/link";

import { BannerSlot } from "@/components/BannerSlot";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveCity } from "@/hooks/useActiveCity";
import { useBannerSlots } from "@/hooks/useBannerSlots";

// Placeholder de la Etapa 8b — el ABM completo de Gastronomía y otros
// lugares (bares, restaurantes, etc. con horario, delivery, redes) es la
// Etapa 8e. Ver a_revisar.md. Etapa 8d: se agregan los banners reales de
// la sección "gastronomia" arriba del listado (que sigue siendo placeholder).
export default function LugaresPage() {
  const { activeCity } = useActiveCity();
  const { slots, isLoading } = useBannerSlots({ cityId: activeCity?.id ?? null, section: "gastronomia" });

  return (
    <main className="container mx-auto flex max-w-2xl flex-col gap-6 py-6">
      <header className="flex items-center gap-3 border-b border-border pb-3 text-ink-3">
        <Link href="/" className="flex items-center gap-3">
          <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
        </Link>
        <span className="text-sm font-medium">Gastronomía y otros</span>
      </header>

      <div className="flex flex-col gap-2 px-4">
        {isLoading ? (
          <div className="flex flex-col gap-2" data-testid="gastronomia-banners-loading">
            <Skeleton className="aspect-[3.2/1] w-full rounded-xl md:aspect-[3.88/1]" />
            <Skeleton className="aspect-[3.2/1] w-full rounded-xl md:aspect-[3.88/1]" />
            <Skeleton className="aspect-[3.2/1] w-full rounded-xl md:aspect-[3.88/1]" />
          </div>
        ) : (
          slots.map((slot) => <BannerSlot key={slot.id} slot={slot} />)
        )}
      </div>

      <div className="mx-4 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-4 bg-surface-2 px-6 py-16 text-center">
        <Store className="h-9 w-9 text-ink-5" aria-hidden />
        <p className="text-sm font-bold text-ink-3">Próximamente</p>
        <p className="max-w-[260px] text-xs text-ink-5">
          Bares, restaurantes, cervecerías y más lugares de tu ciudad, muy pronto acá.
        </p>
      </div>
    </main>
  );
}
