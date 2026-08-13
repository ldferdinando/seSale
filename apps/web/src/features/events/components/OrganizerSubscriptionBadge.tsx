"use client";

import { Badge } from "@/components/ui/badge";
import type { EventStatus, OrganizerSubscriptionStatus } from "@/features/events/types";

const PAYMENT_METHOD_LABEL: Record<OrganizerSubscriptionStatus["payment_method"], string> = {
  mercadopago: "MercadoPago",
  transfer: "Transferencia",
  manual: "Manual",
};

const STATUS_TEXT: Record<OrganizerSubscriptionStatus["status"], string> = {
  pending_approval: "avisó transferencia — pendiente de revisión",
  pending_payment: "inició el pago, sin confirmar",
  active: "pago confirmado",
  expired: "plan vencido",
  cancelled: "pago rechazado o cancelado",
};

/**
 * Solo interesa mostrar el aviso de pago mientras el admin todavía tiene que
 * decidir si aprobar el evento, y solo para los planes que efectivamente se
 * pagan (Destacado/Destacado Plus) — el plan gratis no tiene nada que avisar
 * y una vez aprobado el evento el dato ya dejó de ser relevante para decidir.
 */
export function isRelevantOrganizerSubscription(
  eventStatus: EventStatus,
  subscription: OrganizerSubscriptionStatus | null,
): subscription is OrganizerSubscriptionStatus {
  if (!subscription) return false;
  if (eventStatus === "approved") return false;
  return subscription.plan_type === "dest" || subscription.plan_type === "pro";
}

interface OrganizerSubscriptionBadgeProps {
  subscription: OrganizerSubscriptionStatus;
}

/**
 * Estado de pago más reciente del organizador, visible solo para el propio
 * organizador o un admin (el backend nunca lo manda a otros) — Etapa 6b-1.
 * Se usa en el panel admin de eventos (para decidir si aprobar sabiendo si
 * ya pagaron) y en el detalle del evento.
 */
export function OrganizerSubscriptionBadge({ subscription }: OrganizerSubscriptionBadgeProps) {
  const isPending = subscription.status === "pending_approval" || subscription.status === "pending_payment";

  return (
    <div className="flex flex-col gap-0.5">
      <Badge variant={isPending ? "pro" : subscription.status === "active" ? "default" : "muted"} className="w-fit">
        {subscription.plan_name}
      </Badge>
      <p className="text-xs text-ink-3">
        {PAYMENT_METHOD_LABEL[subscription.payment_method]} — {STATUS_TEXT[subscription.status]}
      </p>
      {subscription.transfer_note && (
        <p className="text-xs text-ink-4">Nota del organizador: {subscription.transfer_note}</p>
      )}
    </div>
  );
}
