"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PlanCard } from "@/features/plans/components/PlanCard";
import { useCheckout } from "@/features/plans/hooks/useCheckout";
import { usePlans } from "@/features/plans/hooks/usePlans";

export function PlansList() {
  const { data: plans, isLoading, isError } = usePlans();
  const checkout = useCheckout();

  function handleContratar(planId: string) {
    checkout.mutate(planId, {
      onSuccess: (response) => {
        window.location.href = response.init_point;
      },
      onError: (error) => {
        // El detalle técnico queda solo en consola/logs — a la UI nunca le
        // mostramos el texto crudo del backend (que puede exponer detalle
        // interno de la API de MercadoPago).
        console.error("Error iniciando el checkout de MercadoPago:", error);
      },
    });
  }

  if (isLoading) {
    return (
      <div data-testid="plans-loading" className="flex flex-col gap-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <p role="alert" className="text-sm text-muted-foreground">
        No pudimos cargar los planes. Intentá de nuevo más tarde.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {checkout.isError && (
        <p role="alert" className="text-sm text-destructive">
          Hubo un problema al procesar el pago. Intentá de nuevo en unos minutos.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {plans?.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onContratar={handleContratar}
            isSubmitting={checkout.isPending && checkout.variables === plan.id}
          />
        ))}
      </div>
    </div>
  );
}
