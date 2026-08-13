"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { parseBankInfo } from "@/features/plans/lib/bank-info";

export function BankInfoCard() {
  const fields = parseBankInfo(process.env.NEXT_PUBLIC_BANK_INFO);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  async function handleCopy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLabel(label);
      setTimeout(() => setCopiedLabel((current) => (current === label ? null : current)), 2000);
    } catch {
      // Si el navegador no soporta el clipboard API, no rompemos el flujo.
    }
  }

  if (fields.length === 0) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Todavía no cargamos los datos bancarios. Escribinos por WhatsApp para coordinar la transferencia.
      </p>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <h2 className="text-sm font-bold text-foreground">Datos para la transferencia</h2>
        {fields.map((field) => (
          <div key={field.label} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
            <div className="flex flex-col">
              <span className="text-xs text-ink-4">{field.label}</span>
              <span className="text-sm font-medium text-foreground">{field.value}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleCopy(field.label, field.value)}
              aria-label={`Copiar ${field.label}`}
            >
              {copiedLabel === field.label ? (
                <Check className="h-4 w-4" aria-hidden />
              ) : (
                <Copy className="h-4 w-4" aria-hidden />
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
