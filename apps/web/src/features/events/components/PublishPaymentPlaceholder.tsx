"use client";

import { CreditCard, QrCode, ShieldCheck, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PUBLISH_PLAN_OPTIONS, type PublishPlan } from "@/features/events/lib/publishPlans";

/**
 * Pantalla de opciones de pago del plan de publicación. Es un placeholder:
 * ningún botón cobra nada todavía — la integración real con Mercado Pago
 * se hace en la Etapa 6. Existe para no dejar al organizador sin feedback
 * cuando elige un plan pago en el resumen.
 */
interface PublishPaymentPlaceholderProps {
  plan: PublishPlan;
  onBack: () => void;
}

export function PublishPaymentPlaceholder({ plan, onBack }: PublishPaymentPlaceholderProps) {
  const planOption = PUBLISH_PLAN_OPTIONS.find((p) => p.value === plan);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
            Resumen de tu plan
          </div>
          {planOption && (
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <planOption.icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                Plan {planOption.label}
              </span>
              <span className="text-sm font-bold text-primary">{planOption.price}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div
        role="status"
        className="flex flex-col gap-1 rounded-xl border border-primary/30 bg-brand-pinkBg px-4 py-3 text-sm text-ink-2"
      >
        <p className="font-bold text-foreground">El pago todavía no está disponible.</p>
        <p className="text-xs text-ink-4">
          Estamos integrando Mercado Pago (Etapa 6). Por ahora podés publicar con el plan gratuito y volver más
          adelante para mejorar tu visibilidad.
        </p>
      </div>

      <div className="flex flex-col gap-2 opacity-50">
        <Button type="button" disabled className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base">
          <CreditCard className="h-4 w-4" aria-hidden />
          Pagar con Mercado Pago
        </Button>
        <Button type="button" disabled variant="outline" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base">
          <QrCode className="h-4 w-4" aria-hidden />
          Pagar con QR
        </Button>
        <Button type="button" disabled variant="outline" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base">
          <Wallet className="h-4 w-4" aria-hidden />
          Transferencia bancaria
        </Button>
      </div>

      <Button type="button" variant="ghost" onClick={onBack}>
        Volver al resumen
      </Button>
    </div>
  );
}
