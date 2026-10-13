"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCheckout } from "@/features/plans/hooks/useCheckout";
import { usePlans } from "@/features/plans/hooks/usePlans";
import { closeCheckoutWindow, goToCheckout, openCheckoutWindow } from "@/features/plans/lib/checkout-window";
import { useReportPaymentProblem } from "@/features/subscriptions/hooks/useReportPaymentProblem";
import type { Subscription } from "@/features/subscriptions/types";
import { ApiError } from "@/lib/api-client";

/**
 * Pago de MercadoPago que quedó sin completar (el organizador cerró el
 * checkout antes de terminar) para un plan dest/pro de un evento.
 */
export function isResumableMercadoPagoPayment(subscription: Subscription): boolean {
  return (
    subscription.status === "pending_payment" &&
    subscription.payment_method === "mercadopago" &&
    subscription.event_id !== null &&
    (subscription.plan_type === "dest" || subscription.plan_type === "pro")
  );
}

/**
 * Pagos pendientes retomables, uno por evento. `/api/subscriptions/me` viene
 * ordenado por created_at desc: solo cuenta la suscripción más reciente de
 * cada evento (si después avisó una transferencia o el pago se aprobó, el
 * pendiente viejo ya no aplica).
 */
export function selectResumablePayments(subscriptions: Subscription[] | undefined): Subscription[] {
  const latestByEvent = new Map<string, Subscription>();
  for (const subscription of subscriptions ?? []) {
    if (subscription.event_id && !latestByEvent.has(subscription.event_id)) {
      latestByEvent.set(subscription.event_id, subscription);
    }
  }
  return [...latestByEvent.values()].filter(isResumableMercadoPagoPayment);
}

interface PendingPaymentCardProps {
  subscription: Subscription;
}

/**
 * Las tres salidas para un pago de MercadoPago interrumpido: retomarlo (el
 * backend reusa la misma suscripción con una preferencia nueva), pasarse a
 * transferencia (convierte la misma suscripción, no crea otra) o avisar un
 * problema al admin (mismo patrón que el aviso de transferencia).
 */
export function PendingPaymentCard({ subscription }: PendingPaymentCardProps) {
  const { data: plans } = usePlans();
  const checkout = useCheckout();
  const reportProblem = useReportPaymentProblem();
  const [showProblemForm, setShowProblemForm] = useState(false);
  const [note, setNote] = useState("");
  const [openedInNewTab, setOpenedInNewTab] = useState(false);

  const eventId = subscription.event_id ?? "";
  const plan = plans?.find((p) => p.id === subscription.plan_id);
  // Mientras cargan los planes se asume disponible; si el backend dice que
  // MP está apagado, solo queda la transferencia.
  const mercadopagoAvailable = plan?.mercadopago_available ?? true;
  const problemReportedAt = reportProblem.data?.problem_reported_at ?? subscription.problem_reported_at;

  const checkoutError =
    checkout.error instanceof ApiError && (checkout.error.status === 409 || checkout.error.status === 400)
      ? checkout.error.message
      : checkout.error
        ? "No pudimos iniciar el pago. Intentá de nuevo en unos minutos."
        : null;

  function handleContinuePayment() {
    const checkoutWindow = openCheckoutWindow();
    setOpenedInNewTab(false);
    checkout.mutate(
      { planId: subscription.plan_id, eventId },
      {
        onSuccess: (response) => {
          goToCheckout(checkoutWindow, response.init_point);
          setOpenedInNewTab(Boolean(checkoutWindow));
        },
        onError: () => closeCheckoutWindow(checkoutWindow),
      },
    );
  }

  function handleReportProblem(e: React.FormEvent) {
    e.preventDefault();
    reportProblem.mutate(
      { subscriptionId: subscription.id, note: note.trim() || undefined },
      { onSuccess: () => setShowProblemForm(false) },
    );
  }

  return (
    <div
      role="region"
      aria-label={`Pago sin completar: ${subscription.event_title ?? subscription.plan_name}`}
      data-testid="pending-payment-card"
      className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-bold text-foreground">Tu pago con MercadoPago quedó sin completar</p>
          <p className="break-words text-xs text-ink-3">
            Plan {subscription.plan_name}
            {subscription.event_title ? ` para "${subscription.event_title}"` : ""} · $
            {new Intl.NumberFormat("es-AR").format(subscription.amount_paid)}. Tu evento sigue publicado como
            gratuito hasta que se confirme el pago.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {mercadopagoAvailable && (
          <Button
            type="button"
            onClick={handleContinuePayment}
            disabled={checkout.isPending}
            className="h-11 rounded-xl"
          >
            {checkout.isPending ? "Redirigiendo..." : "Continuar pago con MercadoPago"}
          </Button>
        )}
        <Button asChild variant="outline" className="h-11 rounded-xl">
          <Link href={`/planes/transferencia?plan_id=${subscription.plan_id}&event_id=${eventId}`}>
            Cambiar a transferencia
          </Link>
        </Button>
        {!problemReportedAt && !showProblemForm && (
          <Button type="button" variant="ghost" className="h-11 rounded-xl" onClick={() => setShowProblemForm(true)}>
            Tuve un problema, avisanos
          </Button>
        )}
      </div>

      {openedInNewTab && (
        <p role="status" className="text-xs text-ink-3">
          Abrimos MercadoPago en una pestaña nueva. Cuando termines el pago, volvé a esta pestaña.
        </p>
      )}

      {checkoutError && (
        <p role="alert" className="text-sm text-destructive">
          {checkoutError}
        </p>
      )}

      {showProblemForm && !problemReportedAt && (
        <form onSubmit={handleReportProblem} className="flex flex-col gap-2">
          <Label htmlFor={`payment-problem-${subscription.id}`}>Contanos qué pasó (opcional)</Label>
          <Textarea
            id={`payment-problem-${subscription.id}`}
            rows={3}
            maxLength={1000}
            placeholder="Ej: MercadoPago me rechazó la tarjeta y no sé si se cobró"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {reportProblem.isError && (
            <p role="alert" className="text-sm text-destructive">
              No pudimos enviar tu aviso. Intentá de nuevo.
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={reportProblem.isPending} className="h-10 rounded-xl">
              {reportProblem.isPending ? "Enviando aviso..." : "Enviar aviso"}
            </Button>
            <Button type="button" variant="ghost" className="h-10 rounded-xl" onClick={() => setShowProblemForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {problemReportedAt && (
        <p role="status" className="flex items-center gap-2 text-xs text-ink-3">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-green" aria-hidden />
          Recibimos tu aviso del {format(parseISO(problemReportedAt), "d 'de' MMMM, HH:mm", { locale: es })} hs. Te
          vamos a contactar para ayudarte con el pago.
        </p>
      )}
    </div>
  );
}
