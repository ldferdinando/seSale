"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCheckout } from "@/features/plans/hooks/useCheckout";
import { usePlans } from "@/features/plans/hooks/usePlans";
import type { Plan } from "@/features/plans/types";
import { useCreateEvent } from "@/features/events/hooks/useCreateEvent";
import { EVENT_PLAN_COPY } from "@/features/events/lib/publishPlans";
import type { Event, EventCreateInput, EventPlan } from "@/features/events/types";
import { ApiError } from "@/lib/api-client";

const PLAN_ORDER: EventPlan[] = ["gratis", "dest", "pro"];

function formatPrice(plan: Plan): string {
  if (plan.plan_type === "gratis") return "Gratis";
  if (!plan.price) return "Consultar precio";
  if (plan.price.amount === 0) return "Gratis";
  return `$${new Intl.NumberFormat("es-AR").format(plan.price.amount)}/mes`;
}

interface EventPlanChooserProps {
  payload: EventCreateInput;
  onPublished: (event: Event) => void;
}

/**
 * Etapa 9b — sección "Elegir visibilidad" del resumen del evento (Paso 2).
 * El evento se crea SIEMPRE con plan="gratis" (el backend lo protege
 * igual, ver create_event) apenas se elige cualquiera de las tres
 * opciones; para los planes pagos, después de creado se dispara el mismo
 * flujo de pago que ya existe en /planes (checkout de MercadoPago o aviso
 * de transferencia) — ver ARCHITECTURE.md, flujo de pago de plan.
 */
export function EventPlanChooser({ payload, onPublished }: EventPlanChooserProps) {
  const router = useRouter();
  const { data: plans, isLoading: isLoadingPlans } = usePlans();
  const createEvent = useCreateEvent();
  const checkout = useCheckout();
  const [createdEvent, setCreatedEvent] = useState<Event | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orderedPlans = PLAN_ORDER.map((type) => plans?.find((p) => p.plan_type === type)).filter(
    (p): p is Plan => Boolean(p),
  );

  async function ensureEventCreated(): Promise<Event> {
    if (createdEvent) return createdEvent;
    const event = await createEvent.mutateAsync({ ...payload, plan: "gratis" });
    setCreatedEvent(event);
    return event;
  }

  async function handlePublishGratis() {
    setError(null);
    setPendingAction("gratis");
    try {
      const event = await ensureEventCreated();
      onPublished(event);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos publicar el evento.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleContratarMercadoPago(planId: string) {
    setError(null);
    setPendingAction(`mp-${planId}`);
    try {
      const event = await ensureEventCreated();
      const { init_point } = await checkout.mutateAsync({ planId, eventId: event.id });
      window.location.href = init_point;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos iniciar el pago.");
      setPendingAction(null);
    }
  }

  async function handleTransferencia(planId: string) {
    setError(null);
    setPendingAction(`transfer-${planId}`);
    try {
      const event = await ensureEventCreated();
      router.push(`/planes/transferencia?plan_id=${planId}&event_id=${event.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos continuar con la transferencia.");
      setPendingAction(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="px-1 text-base font-bold text-foreground">Elegí visibilidad</h2>

      {isLoadingPlans && <p className="px-1 text-sm text-ink-4">Cargando planes...</p>}

      <div className="flex flex-col gap-3">
        {orderedPlans.map((plan) => {
          const copy = EVENT_PLAN_COPY[plan.plan_type as EventPlan];
          if (!copy) return null;
          const Icon = copy.icon;
          const isFree = plan.plan_type === "gratis";

          return (
            <Card key={plan.id}>
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                    <span aria-hidden>{copy.emoji}</span>
                    <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                    {copy.label}
                  </span>
                  {plan.price?.promo_label && <Badge variant="pro">{plan.price.promo_label}</Badge>}
                </div>
                <p className="text-xs text-ink-4">{copy.desc}</p>
                <p className="text-sm font-bold text-primary">{formatPrice(plan)}</p>

                {isFree ? (
                  <Button
                    type="button"
                    disabled={pendingAction !== null}
                    onClick={handlePublishGratis}
                    className="h-11 w-full rounded-xl"
                  >
                    {pendingAction === "gratis" ? "Publicando..." : "Publicar gratis"}
                  </Button>
                ) : (
                  <>
                    {plan.mercadopago_available && (
                      <Button
                        type="button"
                        disabled={pendingAction !== null}
                        onClick={() => handleContratarMercadoPago(plan.id)}
                        className="h-11 w-full rounded-xl"
                      >
                        {pendingAction === `mp-${plan.id}` ? "Redirigiendo..." : `Contratar ${copy.label}`}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={pendingAction !== null}
                      onClick={() => handleTransferencia(plan.id)}
                      className="h-10 w-full rounded-xl text-sm"
                    >
                      {pendingAction === `transfer-${plan.id}` ? "Redirigiendo..." : "Ya hice una transferencia"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <p className="px-1 text-xs text-ink-4">
        Todos los eventos pasan por revisión antes de publicarse. Si elegís un plan pago, el evento se activa cuando
        confirmemos tu pago.
      </p>
    </div>
  );
}
