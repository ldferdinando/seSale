"use client";

import { Crown, MessageCircle, Star, Ticket, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { sesaleWhatsappHref } from "@/features/plans/lib/whatsapp";
import type { Plan } from "@/features/plans/types";

const PLAN_ICONS: Record<Plan["plan_type"], LucideIcon> = {
  gratis: Ticket,
  dest: Star,
  pro: Crown,
  banner: MessageCircle,
};

function formatPrice(amount: number): string {
  if (amount === 0) return "$0";
  return `$${new Intl.NumberFormat("es-AR").format(amount)}`;
}

interface PlanCardProps {
  plan: Plan;
  onContratar: (planId: string) => void;
  isSubmitting: boolean;
}

export function PlanCard({ plan, onContratar, isSubmitting }: PlanCardProps) {
  const Icon = PLAN_ICONS[plan.plan_type];

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Icon className="h-4 w-4 text-primary" aria-hidden />
            {plan.name}
          </span>
          {plan.price?.promo_label && <Badge variant="pro">{plan.price.promo_label}</Badge>}
        </div>

        {plan.description && <p className="text-xs text-ink-4">{plan.description}</p>}

        <p className="text-lg font-black text-primary">
          {plan.plan_type === "banner" ? "Consultar" : plan.price ? formatPrice(plan.price.amount) : "—"}
        </p>

        {plan.plan_type === "gratis" && (
          <Button type="button" disabled className="h-11 w-full rounded-xl">
            Tu plan actual
          </Button>
        )}

        {(plan.plan_type === "dest" || plan.plan_type === "pro") && (
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => onContratar(plan.id)}
            className="h-11 w-full rounded-xl"
          >
            {isSubmitting ? "Redirigiendo..." : "Contratar"}
          </Button>
        )}

        {plan.plan_type === "banner" && (
          <Button asChild variant="outline" className="h-11 w-full rounded-xl">
            <a
              href={sesaleWhatsappHref(`Hola! Quiero consultar por el plan ${plan.name} de seSALE.`)}
              target="_blank"
              rel="noreferrer"
            >
              Consultar
            </a>
          </Button>
        )}

      </CardContent>
    </Card>
  );
}
