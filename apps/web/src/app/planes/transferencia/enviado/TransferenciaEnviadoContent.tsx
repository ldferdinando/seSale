"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { sesaleWhatsappHref } from "@/features/plans/lib/whatsapp";

export function TransferenciaEnviadoContent() {
  const searchParams = useSearchParams();
  const planName = searchParams.get("plan_name") ?? "";

  return (
    <main className="container mx-auto flex max-w-md flex-col items-center gap-5 py-16 text-center">
      <CheckCircle2 className="h-14 w-14 text-[#1D9E75]" aria-hidden />
      <h1 className="text-2xl font-black tracking-tight">¡Recibimos tu aviso!</h1>
      <p className="text-sm text-ink-4">
        Vamos a revisar tu transferencia en las próximas horas. Tu plan se activa cuando confirmemos el pago — te avisamos por email.
      </p>

      <div className="flex w-full flex-col gap-2">
        <Button asChild className="h-12 w-full rounded-xl text-base">
          <Link href="/mi-cuenta">Ver mis eventos</Link>
        </Button>
        <Button asChild variant="outline" className="h-12 w-full rounded-xl text-base">
          <a
            href={sesaleWhatsappHref(
              `Hola, avisé que hice una transferencia para el plan ${planName} en seSALE, te mando el comprobante.`,
            )}
            target="_blank"
            rel="noreferrer"
          >
            Contactar por WhatsApp
          </a>
        </Button>
      </div>
    </main>
  );
}
