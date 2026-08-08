"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivateSubscription } from "@/features/subscriptions/hooks/useActivateSubscription";
import { useAdminSubscriptions } from "@/features/subscriptions/hooks/useAdminSubscriptions";
import type { AdminSubscription, SubscriptionStatus } from "@/features/subscriptions/types";

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  active: "Activa",
  expired: "Vencida",
  cancelled: "Cancelada",
  pending_payment: "Pago pendiente",
};

function ActivateForm({ subscription }: { subscription: AdminSubscription }) {
  const [expiresAt, setExpiresAt] = useState("");
  const activate = useActivateSubscription();

  function handleActivate() {
    if (!expiresAt) return;
    activate.mutate({ subscriptionId: subscription.id, expiresAt: new Date(expiresAt).toISOString() });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="date"
        aria-label={`Fecha de vencimiento — ${subscription.user_public_name}`}
        value={expiresAt}
        onChange={(e) => setExpiresAt(e.target.value)}
        className="w-auto"
      />
      <Button type="button" size="sm" disabled={!expiresAt || activate.isPending} onClick={handleActivate}>
        {activate.isPending ? "Activando..." : "Activar"}
      </Button>
    </div>
  );
}

function SubscriptionRow({ subscription }: { subscription: AdminSubscription }) {
  return (
    <div
      data-testid="admin-subscription-row"
      className="flex flex-col gap-2 rounded-lg border border-border p-3"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">{subscription.user_public_name}</p>
          <p className="text-xs text-ink-4">{subscription.user_email}</p>
        </div>
        <Badge variant={subscription.status === "active" ? "pro" : "muted"}>
          {STATUS_LABEL[subscription.status]}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-4">
        <span>
          Plan: <strong className="text-foreground">{subscription.plan_name}</strong>
        </span>
        <span>${new Intl.NumberFormat("es-AR").format(subscription.amount_paid)}</span>
        {subscription.status === "active" && (
          <span>Vence: {format(parseISO(subscription.expires_at), "d MMM yyyy", { locale: es })}</span>
        )}
        {subscription.mp_payment_id && <span>MP: {subscription.mp_payment_id}</span>}
      </div>

      {subscription.plan_type === "banner" && subscription.status === "pending_payment" && (
        <ActivateForm subscription={subscription} />
      )}
    </div>
  );
}

export function AdminSubscriptionsPanel() {
  const { data: subscriptions, isLoading, isError } = useAdminSubscriptions();

  return (
    <section className="flex flex-col gap-4">
      <h2 className="px-1 text-lg font-bold text-foreground">Suscripciones</h2>

      {isLoading && (
        <div data-testid="admin-subscriptions-loading" className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {isError && (
        <p role="alert" className="text-sm text-muted-foreground">
          No pudimos cargar las suscripciones. Intentá de nuevo más tarde.
        </p>
      )}

      {subscriptions && subscriptions.length === 0 && (
        <p className="text-sm text-muted-foreground">Todavía no hay suscripciones cargadas.</p>
      )}

      {subscriptions && subscriptions.length > 0 && (
        <div className="flex flex-col gap-3">
          {subscriptions.map((subscription) => (
            <SubscriptionRow key={subscription.id} subscription={subscription} />
          ))}
        </div>
      )}
    </section>
  );
}
