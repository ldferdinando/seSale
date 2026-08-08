"use client";

import { XCircle } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { sesaleWhatsappHref } from "@/features/plans/lib/whatsapp";

export default function PagoFallidoPage() {
  return (
    <main className="container mx-auto flex max-w-md flex-col items-center gap-5 py-16 text-center">
      <XCircle className="h-14 w-14 text-destructive" aria-hidden />
      <h1 className="text-2xl font-black tracking-tight">El pago no pudo procesarse</h1>
      <p className="text-sm text-ink-4">
        No pudimos completar tu pago. Puede haber sido rechazado por tu medio de pago o cancelado durante el
        proceso. Podés intentarlo de nuevo cuando quieras.
      </p>

      <div className="flex w-full flex-col gap-2">
        <Button asChild className="h-12 w-full rounded-xl text-base">
          <Link href="/planes">Intentar nuevamente</Link>
        </Button>
        <Button asChild variant="outline" className="h-12 w-full rounded-xl text-base">
          <a href={sesaleWhatsappHref("Hola! Tuve un problema pagando un plan en seSALE.")} target="_blank" rel="noreferrer">
            Contactar soporte
          </a>
        </Button>
      </div>
    </main>
  );
}
