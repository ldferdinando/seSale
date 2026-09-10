import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import type { Category } from "@/features/events/types";

import { CategoriaDetalleContent } from "./CategoriaDetalleContent";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// La ciudad activa vive sólo en el cliente (GPS/localStorage), así que el
// metadata server-side usa la ciudad por defecto de la app. El subtítulo
// visible de la página sí usa la ciudad activa real.
const DEFAULT_CITY_NAME = "General Roca";

interface PageProps {
  params: Promise<{ key: string }>;
}

async function fetchActiveCategories(): Promise<Category[]> {
  try {
    const response = await fetch(`${API_URL}/api/categories`, { cache: "no-store" });
    if (!response.ok) return [];
    return (await response.json()) as Category[];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { key } = await params;
  const category = (await fetchActiveCategories()).find((c) => c.key === key);

  if (!category) {
    return { title: "Categoría — seSALE" };
  }

  return {
    title: `${category.name} en ${DEFAULT_CITY_NAME} — seSALE`,
    description: `Eventos de ${category.name} en ${DEFAULT_CITY_NAME}, Patagonia. Encontrá los próximos eventos en seSALE.`,
  };
}

export default async function CategoriaDetallePage({ params }: PageProps) {
  const { key } = await params;
  const category = (await fetchActiveCategories()).find((c) => c.key === key);

  if (!category) {
    notFound();
  }

  return (
    <main className="container mx-auto flex max-w-2xl flex-col gap-4 py-6">
      <Link
        href="/categorias"
        className="flex items-center gap-3 border-b border-border pb-3 text-ink-3"
      >
        <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
        <span className="text-sm font-medium">Volver</span>
      </Link>
      <div className="px-1">
        <CategoriaDetalleContent category={category} />
      </div>
    </main>
  );
}
