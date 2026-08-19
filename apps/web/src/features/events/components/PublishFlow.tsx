"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { EventForm } from "@/features/events/components/EventForm";
import { EventSummaryView } from "@/features/events/components/EventSummaryView";
import { payloadToFormValues } from "@/features/events/lib/eventPayload";
import type { EventCreateInput } from "@/features/events/types";

type Step = { name: "form"; payload?: EventCreateInput } | { name: "resumen"; payload: EventCreateInput };

/**
 * Orquesta el alta de un evento: formulario → resumen → elegir visibilidad
 * → publicar (Etapa 9b). El plan (gratis/dest/pro) se elige en el resumen
 * (EventPlanChooser), no en el formulario — este solo junta los datos del
 * evento.
 */
export function PublishFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: "form" });

  if (step.name === "resumen") {
    return (
      <EventSummaryView
        payload={step.payload}
        onBack={() => setStep({ name: "form", payload: step.payload })}
        onPublished={() => router.push("/mis-eventos?published=1")}
      />
    );
  }

  return (
    <EventForm
      mode="create"
      initialValues={step.payload ? payloadToFormValues(step.payload) : undefined}
      onContinue={(payload) => setStep({ name: "resumen", payload })}
    />
  );
}
