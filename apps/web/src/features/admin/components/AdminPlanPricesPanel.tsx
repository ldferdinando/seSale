"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminPlanPricing, useCreatePlanPrice } from "@/features/plans/hooks/useAdminPlanPrices";
import type { AdminPlanPrice, AdminPlanPricing } from "@/features/plans/types";
import { ApiError } from "@/lib/api-client";

const PLAN_PRICE_MAX_AMOUNT = 100_000_000;
const PROMO_LABEL_MAX_LENGTH = 100;

function formatAmount(amount: number): string {
  return `$${new Intl.NumberFormat("es-AR").format(amount)}`;
}

function formatDay(day: string): string {
  return format(parseISO(day), "d MMM yyyy", { locale: es });
}

/** Una fila cuyo `valid_until` es anterior a `valid_from` fue reemplazada el
 * mismo día en que arrancaba: queda en el historial pero nunca aplicó. */
function formatValidity(price: AdminPlanPrice): string {
  if (price.valid_until === null) return `Desde ${formatDay(price.valid_from)}`;
  if (price.valid_until < price.valid_from) return `Reemplazado el ${formatDay(price.valid_from)}`;
  return `${formatDay(price.valid_from)} – ${formatDay(price.valid_until)}`;
}

interface PlanPriceFormProps {
  plan: AdminPlanPricing;
}

function PlanPriceForm({ plan }: PlanPriceFormProps) {
  const createPrice = useCreatePlanPrice();
  const [amount, setAmount] = useState("");
  const [promoLabel, setPromoLabel] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountId = `plan-price-amount-${plan.id}`;
  const promoId = `plan-price-promo-${plan.id}`;
  const current = plan.current_price;
  const pastPrices = plan.history.filter((price) => price.id !== current?.id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const parsed = Number(amount);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setError("Ingresá un monto entero mayor a cero.");
      return;
    }
    if (parsed > PLAN_PRICE_MAX_AMOUNT) {
      setError("El monto es demasiado alto.");
      return;
    }
    try {
      await createPrice.mutateAsync({
        planId: plan.id,
        input: { amount: parsed, promo_label: promoLabel.trim() || null },
      });
      setAmount("");
      setPromoLabel("");
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar el precio.");
    }
  }

  return (
    <section aria-labelledby={`plan-price-title-${plan.id}`} className="flex flex-col gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-0.5">
        <h3 id={`plan-price-title-${plan.id}`} className="text-sm font-semibold text-foreground">
          {plan.name}
          {!plan.is_active && <span className="ml-2 text-xs font-normal text-ink-4">(inactivo)</span>}
        </h3>
        {current && current.amount > 0 ? (
          <p className="text-sm text-foreground">
            Precio actual: <strong>{formatAmount(current.amount)}</strong> {current.currency}
            {current.promo_label && <span className="text-ink-4"> · {current.promo_label}</span>}
            <span className="block text-xs text-ink-4">{formatValidity(current)}</span>
          </p>
        ) : (
          <p className="text-sm text-destructive">Sin precio cargado — el plan se muestra como “Consultar precio”.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1">
          <Label htmlFor={amountId}>Nuevo precio (ARS)</Label>
          <Input
            id={amountId}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            max={PLAN_PRICE_MAX_AMOUNT}
            value={amount}
            placeholder="Ej: 5000"
            onChange={(e) => {
              setAmount(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor={promoId}>Etiqueta (opcional)</Label>
          <Input
            id={promoId}
            value={promoLabel}
            maxLength={PROMO_LABEL_MAX_LENGTH}
            placeholder="Ej: Promo lanzamiento"
            onChange={(e) => {
              setPromoLabel(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        <Button type="submit" disabled={createPrice.isPending || amount === ""}>
          {createPrice.isPending ? "Guardando..." : "Actualizar precio"}
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {saved && <p className="text-sm text-[#1D9E75]">Precio actualizado. Rige desde hoy.</p>}

      {pastPrices.length > 0 && (
        <details className="text-xs text-ink-4">
          <summary className="cursor-pointer">Historial reciente</summary>
          <ul className="mt-1 flex flex-col gap-0.5">
            {pastPrices.map((price) => (
              <li key={price.id}>
                {formatAmount(price.amount)} · {formatValidity(price)}
                {price.promo_label && ` · ${price.promo_label}`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

/** Precios de los planes pagos (Destacado / Destacado Plus). Cambiar el
 * precio crea una fila nueva vigente desde hoy y cierra la anterior — los
 * precios viejos quedan como historial (las suscripciones ya contratadas
 * siguen apuntando al precio con el que se pagaron). */
export function AdminPlanPricesPanel() {
  const { data: plans, isLoading, isError } = useAdminPlanPricing();

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        No pudimos cargar los precios de los planes.
      </p>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-bold text-foreground">Precios de planes</h2>
          <p className="text-xs text-ink-4">
            El precio nuevo rige desde hoy y se ve al instante en /planes. Las suscripciones ya contratadas mantienen el
            precio con el que se pagaron.
          </p>
        </div>
        {plans && plans.length > 0 ? (
          plans.map((plan) => <PlanPriceForm key={plan.id} plan={plan} />)
        ) : (
          <p className="text-sm text-ink-4">No hay planes pagos configurados.</p>
        )}
      </CardContent>
    </Card>
  );
}
