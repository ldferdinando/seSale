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
      <h1 className="text-2xl font-black tracking-tight">¡Comprobante enviado!</h1>
      <p className="text-sm text-ink-4">
        Revisaremos tu pago en las próximas horas. Te avisamos por email cuando tu plan esté activo.
      </p>

      <div className="flex w-full flex-col gap-2">
        <Button asChild className="h-12 w-full rounded-xl text-base">
          <Link href="/mi-cuenta">Ver mis eventos</Link>
        </Button>
        <Button asChild variant="outline" className="h-12 w-full rounded-xl text-base">
          <a
            href={sesaleWhatsappHref(
              `Hola, acabo de enviar el comprobante para el plan ${planName} en seSALE.`,
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
