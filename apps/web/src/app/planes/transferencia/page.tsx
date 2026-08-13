"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { BankInfoCard } from "@/features/plans/components/BankInfoCard";
import { sesaleWhatsappHref } from "@/features/plans/lib/whatsapp";
import { usePlans } from "@/features/plans/hooks/usePlans";
import { useTransferSubscription } from "@/features/subscriptions/hooks/useTransferSubscription";
import { ApiError } from "@/lib/api-client";

function formatPrice(amount: number): string {
  return `$${new Intl.NumberFormat("es-AR").format(amount)}`;
}

export default function TransferenciaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get("plan_id") ?? "";
  const eventId = searchParams.get("event_id") ?? "";

  const { data: plans, isLoading } = usePlans();
  const plan = plans?.find((p) => p.id === planId);

  const [note, setNote] = useState("");
  const transfer = useTransferSubscription();

  const errorMessage =
    transfer.error instanceof ApiError
      ? transfer.error.status === 400
        ? "Este plan no admite pago por transferencia."
        : transfer.error.status === 404
          ? "No encontramos el plan o el evento seleccionado."
          : "No pudimos registrar tu aviso. Intentá de nuevo."
      : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!planId || !eventId) return;
    transfer.mutate(
      { planId, eventId, note: note.trim() || undefined },
      {
        onSuccess: () => {
          router.push(`/planes/transferencia/enviado?plan_name=${encodeURIComponent(plan?.name ?? "")}`);
        },
      },
    );
  }

  return (
    <main className="container mx-auto flex max-w-2xl flex-col gap-6 py-6">
      <header className="flex flex-col gap-4">
        <Link
          href={eventId ? `/planes?event_id=${eventId}` : "/planes"}
          className="flex items-center gap-3 border-b border-border pb-3 text-ink-3"
        >
          <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
          <span className="text-sm font-medium">Volver a planes</span>
        </Link>
        <h1 className="px-1 text-2xl font-black tracking-tight">Transferencia bancaria</h1>
      </header>

      {isLoading && <Skeleton className="h-24 w-full" />}

      {!isLoading && (!plan || !eventId) && (
        <p role="alert" className="text-sm text-destructive">
          No encontramos el plan o el evento seleccionado. Volvé a la pantalla de planes e intentá de nuevo.
        </p>
      )}

      {plan && eventId && (
        <>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <span className="text-sm font-bold text-foreground">{plan.name}</span>
              <span className="text-lg font-black text-primary">
                {plan.price ? formatPrice(plan.price.amount) : "—"}
              </span>
            </CardContent>
          </Card>

          <BankInfoCard />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="transfer-note">¿Ya enviaste el comprobante? Contanos algo (opcional)</Label>
              <Textarea
                id="transfer-note"
                rows={3}
                maxLength={1000}
                placeholder="Ej: Ya transferí y mandé el comprobante por WhatsApp"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <Button asChild variant="outline" className="h-11 w-full rounded-xl">
              <a
                href={sesaleWhatsappHref(
                  `Hola! Ya realicé una transferencia para el plan ${plan.name} en seSALE, te mando el comprobante.`,
                )}
                target="_blank"
                rel="noreferrer"
              >
                Enviar comprobante por WhatsApp
              </a>
            </Button>

            {errorMessage && (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage}
              </p>
            )}

            <Button type="submit" disabled={transfer.isPending} className="h-12 w-full rounded-xl text-base">
              {transfer.isPending ? "Enviando..." : "Ya envié el comprobante"}
            </Button>

            <p className="text-xs text-ink-4">
              Una vez que verifiquemos tu pago, tu plan se activará y tus eventos aparecerán como destacados. Te
              avisamos por email.
            </p>
          </form>
        </>
      )}
    </main>
  );
}
