import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { GastroDetailPage } from "@/features/gastro/components/GastroDetailPage";
import type { GastroPlace } from "@/features/gastro/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchGastroPlaceForMetadata(id: string): Promise<GastroPlace | null> {
  try {
    const response = await fetch(`${API_URL}/api/gastro/${id}`, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as GastroPlace;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const place = await fetchGastroPlaceForMetadata(id);

  if (!place) {
    return { title: "Lugar — seSALE" };
  }

  const description = (place.description ?? "").slice(0, 160);
  const image = place.cover_img_url ?? undefined;

  return {
    title: `${place.name} — seSALE`,
    description,
    openGraph: {
      title: `${place.name} — seSALE`,
      description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function LugarDetallePage({ params }: PageProps) {
  const { id } = await params;

  return (
    <main className="container mx-auto flex max-w-2xl flex-col gap-4 py-6">
      <Link href="/lugares" className="flex items-center gap-3 border-b border-border pb-3 text-ink-3">
        <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
        <span className="text-sm font-medium">Volver</span>
      </Link>
      <div className="px-1">
        <GastroDetailPage placeId={id} />
      </div>
    </main>
  );
}
