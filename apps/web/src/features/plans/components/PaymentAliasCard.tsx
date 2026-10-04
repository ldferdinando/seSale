"use client";

import { Check, Copy, MessageCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { sesaleWhatsappHref } from "@/features/plans/lib/whatsapp";
import { useSiteSettings } from "@/features/site-settings/hooks/useSiteSettings";

interface PaymentAliasCardProps {
  planName: string;
}

/** Alias de pago por transferencia, configurable desde el admin
 * (Configuración). Sin alias cargado — o si no se pudo leer — se pide
 * coordinar el pago por WhatsApp en vez de dejar el espacio vacío. */
export function PaymentAliasCard({ planName }: PaymentAliasCardProps) {
  const { data: siteSettings, isLoading } = useSiteSettings();
  const [copied, setCopied] = useState(false);
  const paymentAlias = siteSettings?.payment_alias ?? null;

  async function handleCopy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Si el navegador no soporta el clipboard API, no rompemos el flujo.
    }
  }

  if (isLoading) return <Skeleton className="h-20 w-full" />;

  if (!paymentAlias) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <h2 className="text-sm font-bold text-foreground">Datos para la transferencia</h2>
          <p className="text-sm text-ink-3">Contactanos por WhatsApp para coordinar el pago.</p>
          <Button asChild variant="outline" className="h-11 w-full rounded-xl">
            <a
              href={sesaleWhatsappHref(`Hola! Quiero pagar el plan ${planName} de seSALE por transferencia.`)}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden />
              Coordinar el pago por WhatsApp
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <h2 className="text-sm font-bold text-foreground">Datos para la transferencia</h2>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="text-xs text-ink-4">Alias</span>
            <span className="break-all text-base font-bold text-foreground">{paymentAlias}</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => handleCopy(paymentAlias)}>
            {copied ? <Check className="mr-1.5 h-4 w-4" aria-hidden /> : <Copy className="mr-1.5 h-4 w-4" aria-hidden />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
