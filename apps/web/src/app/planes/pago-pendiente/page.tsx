"use client";

import { Clock } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function PagoPendientePage() {
  return (
    <main className="container mx-auto flex max-w-md flex-col items-center gap-5 py-16 text-center">
      <Clock className="h-14 w-14 text-primary" aria-hidden />
      <h1 className="text-2xl font-black tracking-tight">Tu pago está siendo procesado</h1>
      <p className="text-sm text-ink-4">
        Esto puede demorar unos minutos. Tu plan se activará automáticamente en cuanto se confirme el pago —
        no hace falta que hagas nada más.
      </p>

      <Button asChild className="h-12 w-full rounded-xl text-base">
        <Link href="/mi-cuenta">Ver mis planes</Link>
      </Button>
    </main>
  );
}
