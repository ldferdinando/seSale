"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { EventForm } from "@/features/events/components/EventForm";
import { EventSummaryView } from "@/features/events/components/EventSummaryView";
import { PublishPaymentPlaceholder } from "@/features/events/components/PublishPaymentPlaceholder";
import { payloadToFormValues } from "@/features/events/lib/eventPayload";
import type { PublishPlan } from "@/features/events/lib/publishPlans";
import type { EventCreateInput } from "@/features/events/types";

type Step =
  | { name: "form"; payload?: EventCreateInput; plan?: PublishPlan }
  | { name: "resumen"; payload: EventCreateInput; plan: PublishPlan }
  | { name: "pago"; payload: EventCreateInput; plan: PublishPlan };

/**
 * Orquesta el alta de un evento: formulario → resumen → (publicar directo
 * si el plan es gratis, o pantalla de pago placeholder si es un plan pago).
 */
export function PublishFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: "form" });

  if (step.name === "resumen") {
    return (
      <EventSummaryView
        payload={step.payload}
        plan={step.plan}
        onBack={() => setStep({ name: "form", payload: step.payload, plan: step.plan })}
        onPublished={() => router.push("/mis-eventos?published=1")}
        onNeedsPayment={() => setStep({ name: "pago", payload: step.payload, plan: step.plan })}
      />
    );
  }

  if (step.name === "pago") {
    return (
      <PublishPaymentPlaceholder
        plan={step.plan}
        onBack={() => setStep({ name: "resumen", payload: step.payload, plan: step.plan })}
      />
    );
  }

  return (
    <EventForm
      mode="create"
      initialValues={step.payload ? payloadToFormValues(step.payload) : undefined}
      initialPlan={step.plan}
      onContinue={(payload, plan) => setStep({ name: "resumen", payload, plan })}
    />
  );
}
