"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Clock } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMySubscriptions } from "@/features/subscriptions/hooks/useMySubscriptions";
import type { Subscription } from "@/features/subscriptions/types";

const STATUS_LABEL: Record<Subscription["status"], string> = {
  active: "Activa",
  expired: "Vencida",
  cancelled: "Cancelada",
  pending_payment: "Pago pendiente",
  pending_approval: "En revisión",
};

function SubscriptionRow({ subscription }: { subscription: Subscription }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">{subscription.plan_name}</span>
          <Badge variant={subscription.status === "active" ? "pro" : "muted"}>
            {STATUS_LABEL[subscription.status]}
          </Badge>
        </div>
        {subscription.event_title && <p className="text-xs text-ink-4">Evento: {subscription.event_title}</p>}
        {subscription.status === "active" && (
          <p className="text-xs text-ink-4">
            Vence el {format(parseISO(subscription.expires_at), "d 'de' MMMM yyyy", { locale: es })}
          </p>
        )}
        <p className="text-xs text-ink-5">
          ${new Intl.NumberFormat("es-AR").format(subscription.amount_paid)} {subscription.currency}
        </p>
      </CardContent>
    </Card>
  );
}

export function MySubscriptionsSection({ enabled }: { enabled: boolean }) {
  const { data: subscriptions, isLoading, isError } = useMySubscriptions(enabled);

  if (!enabled) return null;

  if (isLoading) {
    return (
      <div data-testid="subscriptions-loading" className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <p role="alert" className="text-sm text-muted-foreground">
        No pudimos cargar tu plan. Intentá de nuevo más tarde.
      </p>
    );
  }

  // Etapa 6b-2: el pago es por evento — un organizador puede tener a la vez
  // un evento con plan activo y otro con un aviso de transferencia pendiente,
  // ambos se muestran (no son excluyentes como cuando era "un plan por cuenta").
  const activeSubscriptions = (subscriptions ?? []).filter((s) => s.status === "active");
  const pendingApprovals = (subscriptions ?? []).filter((s) => s.status === "pending_approval");

  return (
    <div className="flex flex-col gap-3">
      {pendingApprovals.map((subscription) => (
        <div
          key={subscription.id}
          role="status"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
        >
          <Clock className="h-5 w-5 shrink-0 text-ink-4" aria-hidden />
          <p className="text-sm text-ink-3">
            {subscription.event_title
              ? `Tu comprobante de pago para "${subscription.event_title}" está siendo revisado.`
              : "Tu comprobante de pago está siendo revisado."}{" "}
            Te avisamos por email cuando el plan esté activo.
          </p>
        </div>
      ))}

      {activeSubscriptions.map((subscription) => (
        <SubscriptionRow key={subscription.id} subscription={subscription} />
      ))}

      {activeSubscriptions.length === 0 && pendingApprovals.length === 0 && (
        <>
          <p className="text-sm text-muted-foreground">No tenés un plan activo todavía.</p>
          <Button asChild variant="outline" className="w-fit">
            <Link href="/mis-eventos">Elegir un evento para destacar</Link>
          </Button>
        </>
      )}
    </div>
  );
}
