"use client";

import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { GastroDetailView } from "@/features/gastro/components/GastroDetailView";
import { useGastroPlace } from "@/features/gastro/hooks/useGastroPlace";

interface GastroDetailPageProps {
  placeId: string;
}

export function GastroDetailPage({ placeId }: GastroDetailPageProps) {
  const { data: place, isLoading, isError } = useGastroPlace(placeId);

  if (isLoading) {
    return (
      <div data-testid="gastro-detail-loading" className="flex flex-col gap-3">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError || !place) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-muted-foreground">No encontramos este lugar.</p>
        <Link href="/lugares" className="text-sm font-semibold text-primary">
          Volver a Gastronomía
        </Link>
      </div>
    );
  }

  return <GastroDetailView place={place} />;
}
