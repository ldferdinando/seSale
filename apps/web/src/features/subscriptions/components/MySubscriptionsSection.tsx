"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
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

  const activeSubscriptions = (subscriptions ?? []).filter((s) => s.status === "active");

  if (activeSubscriptions.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">No tenés un plan activo todavía.</p>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/planes">Ver planes disponibles</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {activeSubscriptions.map((subscription) => (
        <SubscriptionRow key={subscription.id} subscription={subscription} />
      ))}
    </div>
  );
}
