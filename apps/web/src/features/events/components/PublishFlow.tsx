"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { EventForm } from "@/features/events/components/EventForm";
import { EventSummaryView } from "@/features/events/components/EventSummaryView";
import { useEvent } from "@/features/events/hooks/useEvent";
import { duplicateEventToFormValues, payloadToFormValues } from "@/features/events/lib/eventPayload";
import type { EventCreateInput } from "@/features/events/types";

type Step = { name: "form"; payload?: EventCreateInput } | { name: "resumen"; payload: EventCreateInput };

interface PublishFlowProps {
  /** Feature "Duplicar evento": id del evento original a precargar. El
   * alta sigue siendo una normal (misma validación, mismo paso de plan) —
   * solo cambia qué endpoint se llama al publicar (ver EventPlanChooser). */
  duplicateFromEventId?: string;
}

/**
 * Orquesta el alta de un evento: formulario → resumen → elegir visibilidad
 * → publicar (Etapa 9b). El plan (gratis/dest/pro) se elige en el resumen
 * (EventPlanChooser), no en este formulario — este solo junta los datos del
 * evento.
 */
export function PublishFlow({ duplicateFromEventId }: PublishFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: "form" });
  const { data: sourceEvent, isLoading: isLoadingSource } = useEvent(duplicateFromEventId ?? "", {
    enabled: Boolean(duplicateFromEventId),
  });

  if (duplicateFromEventId && isLoadingSource) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (step.name === "resumen") {
    return (
      <EventSummaryView
        payload={step.payload}
        duplicateFromEventId={duplicateFromEventId}
        onBack={() => setStep({ name: "form", payload: step.payload })}
        onPublished={() => router.push("/mis-eventos?published=1")}
      />
    );
  }

  const duplicateInitialValues =
    duplicateFromEventId && sourceEvent ? duplicateEventToFormValues(sourceEvent) : undefined;

  return (
    <EventForm
      mode="create"
      initialValues={step.payload ? payloadToFormValues(step.payload) : duplicateInitialValues}
      hideOrganizerPicker={Boolean(duplicateFromEventId)}
      onContinue={(payload) => setStep({ name: "resumen", payload })}
    />
  );
}
