"use client";

import { Badge } from "@/components/ui/badge";
import type { OrganizerSubscriptionStatus } from "@/features/events/types";

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
 * Etapa 11a — bug real reportado: el aviso se ocultaba apenas el evento
 * pasaba a `approved` (`eventStatus === "approved" -> false`), sin importar
 * si la suscripción seguía sin revisar. Aprobar el EVENTO (moderación) y
 * aprobar la SUSCRIPCIÓN (pago/transferencia, la que realmente aplica el
 * plan) son dos acciones separadas en dos tabs distintos del panel admin —
 * al aprobar el evento el aviso desaparecía de la lista y el admin perdía
 * de vista que todavía faltaba aprobar el pago en Suscripciones, dejando el
 * evento en "gratis" para siempre. Ahora el criterio es solo el estado de
 * la propia suscripción (pendiente de pago o de revisión), sin mirar el
 * estado del evento — sigue visible aunque el evento ya esté aprobado, y
 * deja de estarlo recién cuando la suscripción se resuelve (`active`,
 * `expired`, `cancelled`).
 */
export function isRelevantOrganizerSubscription(
  subscription: OrganizerSubscriptionStatus | null,
): subscription is OrganizerSubscriptionStatus {
  if (!subscription) return false;
  if (subscription.status !== "pending_approval" && subscription.status !== "pending_payment") return false;
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
