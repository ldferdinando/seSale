"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { EventForm } from "@/features/events/components/EventForm";
import { EventSummaryView } from "@/features/events/components/EventSummaryView";
import { payloadToFormValues } from "@/features/events/lib/eventPayload";
import type { PublishPlan } from "@/features/events/lib/publishPlans";
import type { EventCreateInput } from "@/features/events/types";

type Step =
  | { name: "form"; payload?: EventCreateInput; plan?: PublishPlan }
  | { name: "resumen"; payload: EventCreateInput; plan: PublishPlan };

/**
 * Orquesta el alta de un evento: formulario → resumen → publicar.
 * El evento siempre nace en plan gratis/pending, sin importar el plan de
 * visibilidad elegido en el formulario — para contratar un plan pago el
 * organizador usa el botón "Elegir plan" desde el evento ya publicado
 * (ver EventDetailView) o la sección de planes en Mi cuenta (Etapa 6).
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
