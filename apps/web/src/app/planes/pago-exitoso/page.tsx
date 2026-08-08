"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useMySubscriptions } from "@/features/subscriptions/hooks/useMySubscriptions";

export default function PagoExitosoPage() {
  const { data: currentUser } = useCurrentUser();
  const { data: subscriptions, isLoading } = useMySubscriptions(Boolean(currentUser));

  const activeSubscription = subscriptions?.find((s) => s.status === "active");

  return (
    <main className="container mx-auto flex max-w-md flex-col items-center gap-5 py-16 text-center">
      <CheckCircle2 className="h-14 w-14 text-[#1D9E75]" aria-hidden />
      <h1 className="text-2xl font-black tracking-tight">¡Tu plan está activo!</h1>
      <p className="text-sm text-ink-4">Ya podés disfrutar de la mayor visibilidad para tus eventos en seSALE.</p>

      {isLoading && <Skeleton className="h-16 w-full" />}

      {activeSubscription && (
        <div className="flex w-full flex-col gap-1 rounded-xl border border-border bg-card p-4 text-left">
          <p className="text-sm font-bold text-foreground">{activeSubscription.plan_name}</p>
          <p className="text-xs text-ink-4">
            Vence el {format(parseISO(activeSubscription.expires_at), "d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
      )}

      <Button asChild className="h-12 w-full rounded-xl text-base">
        <Link href="/publicar">Publicar un evento</Link>
      </Button>
    </main>
  );
}
