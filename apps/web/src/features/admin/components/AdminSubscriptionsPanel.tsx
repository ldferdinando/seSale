"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/features/admin/components/ConfirmDialog";
import { RejectSubscriptionModal } from "@/features/admin/components/RejectSubscriptionModal";
import { useActivateSubscription } from "@/features/subscriptions/hooks/useActivateSubscription";
import { useAdminSubscriptions } from "@/features/subscriptions/hooks/useAdminSubscriptions";
import { useReviewSubscription } from "@/features/subscriptions/hooks/useReviewSubscription";
import type { AdminSubscription, PaymentMethod, SubscriptionStatus } from "@/features/subscriptions/types";

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  active: "Activa",
  expired: "Vencida",
  cancelled: "Cancelada",
  pending_payment: "Pago pendiente",
  pending_approval: "Pendiente de revisión",
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  mercadopago: "MercadoPago",
  transfer: "Transferencia",
  manual: "Manual",
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

function ReviewActions({ subscription }: { subscription: AdminSubscription }) {
  const [confirmingApprove, setConfirmingApprove] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const review = useReviewSubscription();

  function handleApprove() {
    review.mutate(
      { subscriptionId: subscription.id, action: "approve" },
      {
        onSuccess: () => {
          setConfirmingApprove(false);
          setFeedback("Suscripción aprobada");
        },
      },
    );
  }

  function handleReject(adminNotes: string | undefined) {
    review.mutate(
      { subscriptionId: subscription.id, action: "reject", adminNotes },
      {
        onSuccess: () => {
          setRejecting(false);
          setFeedback("Suscripción rechazada");
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => setConfirmingApprove(true)}>
          Aprobar
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setRejecting(true)}>
          Rechazar
        </Button>
      </div>

      {feedback && (
        <p role="status" className="text-xs font-medium text-[#1D9E75]">
          {feedback}
        </p>
      )}

      {confirmingApprove && (
        <ConfirmDialog
          title="Aprobar suscripción"
          description={`Vas a activar el plan ${subscription.plan_name} para ${subscription.user_public_name}. Esta acción activa sus eventos como destacados.`}
          confirmLabel="Aprobar"
          isConfirming={review.isPending}
          onConfirm={handleApprove}
          onClose={() => setConfirmingApprove(false)}
        />
      )}

      {rejecting && (
        <RejectSubscriptionModal
          isSubmitting={review.isPending}
          onReject={handleReject}
          onClose={() => setRejecting(false)}
        />
      )}
    </div>
  );
}

function SubscriptionRow({ subscription }: { subscription: AdminSubscription }) {
  const isPendingApproval = subscription.status === "pending_approval";

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
        <div className="flex flex-col items-end gap-1">
          <Badge variant={isPendingApproval ? "pro" : subscription.status === "active" ? "pro" : "muted"}>
            {STATUS_LABEL[subscription.status]}
          </Badge>
          <Badge variant="muted">{PAYMENT_METHOD_LABEL[subscription.payment_method]}</Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-4">
        <span>
          Plan: <strong className="text-foreground">{subscription.plan_name}</strong>
        </span>
        {subscription.event_title && (
          <span>
            Evento: <strong className="text-foreground">{subscription.event_title}</strong>
          </span>
        )}
        <span>${new Intl.NumberFormat("es-AR").format(subscription.amount_paid)}</span>
        {subscription.status === "active" && (
          <span>Vence: {format(parseISO(subscription.expires_at), "d MMM yyyy", { locale: es })}</span>
        )}
        {subscription.mp_payment_id && <span>MP: {subscription.mp_payment_id}</span>}
      </div>

      {subscription.transfer_note && (
        <p className="rounded-lg bg-surface-5 p-2 text-xs text-ink-3">
          Nota del organizador: {subscription.transfer_note}
        </p>
      )}

      {subscription.plan_type === "banner" && subscription.status === "pending_payment" && (
        <ActivateForm subscription={subscription} />
      )}

      {isPendingApproval && <ReviewActions subscription={subscription} />}
    </div>
  );
}

export function AdminSubscriptionsPanel() {
  const { data: subscriptions, isLoading, isError } = useAdminSubscriptions();

  // pending_approval primero (avisos de transferencia esperando revisión), luego el resto
  const sortedSubscriptions = subscriptions
    ? [...subscriptions].sort((a, b) =>
        Number(b.status === "pending_approval") - Number(a.status === "pending_approval"),
      )
    : subscriptions;

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

      {sortedSubscriptions && sortedSubscriptions.length === 0 && (
        <p className="text-sm text-muted-foreground">Todavía no hay suscripciones cargadas.</p>
      )}

      {sortedSubscriptions && sortedSubscriptions.length > 0 && (
        <div className="flex flex-col gap-3">
          {sortedSubscriptions.map((subscription) => (
            <SubscriptionRow key={subscription.id} subscription={subscription} />
          ))}
        </div>
      )}
    </section>
  );
}
