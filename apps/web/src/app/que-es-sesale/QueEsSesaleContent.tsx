"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function QueEsSesaleContent() {
  return (
    <main className="container mx-auto flex max-w-2xl flex-col gap-6 px-4 py-9">
      <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">¿Qué es seSALE?</h1>

      <div className="flex flex-col gap-4 text-sm leading-relaxed text-ink-2">
        <p>seSALE es la agenda cultural del Alto Valle de la Patagonia.</p>
        <p>
          Encontrá todos los eventos culturales de tu ciudad: música en vivo, teatro, ferias, fiestas, standup,
          milongas y mucho más.
        </p>
        <p>Si organizás eventos, podés publicarlos gratis y llegar a toda la comunidad del Alto Valle.</p>
        <p>Estamos en General Roca, Cipolletti y próximamente en más ciudades de la región.</p>
      </div>

      <Button asChild className="w-fit gap-1.5">
        <Link href="/">
          Ver eventos
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Button>
    </main>
  );
}
