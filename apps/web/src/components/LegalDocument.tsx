"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/Logo";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";

interface LegalDocumentProps {
  title: string;
  children: ReactNode;
}

/**
 * Esqueleto compartido de /privacidad y /terminos: mismo header de
 * "volver" y misma banda oscura con el logo que ¿Qué es seSALE?
 * (QueEsSesaleContent.tsx), en versión compacta.
 */
export function LegalDocument({ title, children }: LegalDocumentProps) {
  return (
    <main className="flex flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 text-ink-3">
        <Link href="/" aria-label="Volver al inicio" className="flex items-center gap-3">
          <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
        </Link>
        <h1 className="text-sm font-medium">{title}</h1>
      </header>

      <div className="relative overflow-hidden bg-[linear-gradient(180deg,#0d0d0d_0%,#1a0d14_100%)] px-5 py-6 text-center">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-brand-pink" aria-hidden />
        <div className="mx-auto flex flex-col items-center gap-2">
          <Logo tone="light" />
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8f8f8f]">
            Última actualización: {LEGAL_LAST_UPDATED}
          </p>
        </div>
      </div>

      <div className="container mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">{children}</div>
    </main>
  );
}

interface LegalSectionProps {
  title: string;
  children: ReactNode;
}

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-bold text-ink-1">{title}</h2>
      <div className="flex flex-col gap-2 text-xs leading-relaxed text-ink-3 [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-ink-1">
        {children}
      </div>
    </section>
  );
}
