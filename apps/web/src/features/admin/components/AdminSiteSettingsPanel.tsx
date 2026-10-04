"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSiteSettings, useUpdateSiteSettings } from "@/features/site-settings/hooks/useAdminSiteSettings";
import { ApiError } from "@/lib/api-client";

const PAYMENT_ALIAS_MAX_LENGTH = 100;

/** Configuración general del sitio — por ahora, el alias de pago por
 * transferencia que se muestra en /planes/transferencia. */
export function AdminSiteSettingsPanel() {
  const { data: siteSettings, isLoading, isError } = useAdminSiteSettings();
  const updateSettings = useUpdateSiteSettings();
  const [paymentAlias, setPaymentAlias] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (siteSettings) setPaymentAlias(siteSettings.payment_alias ?? "");
  }, [siteSettings]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await updateSettings.mutateAsync({ payment_alias: paymentAlias.trim() || null });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar la configuración.");
    }
  }

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        No pudimos cargar la configuración.
      </p>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-foreground">Pago por transferencia</h2>
          <div className="flex flex-col gap-1">
            <Label htmlFor="payment-alias">Alias de pago</Label>
            <Input
              id="payment-alias"
              value={paymentAlias}
              maxLength={PAYMENT_ALIAS_MAX_LENGTH}
              placeholder="Ej: sesale.pagos"
              onChange={(e) => {
                setPaymentAlias(e.target.value);
                setSaved(false);
              }}
            />
            <p className="text-xs text-ink-4">
              Se muestra a los organizadores al pagar un plan por transferencia. Si lo dejás vacío, se les pide que
              escriban por WhatsApp para coordinar el pago.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {saved && <p className="text-sm text-[#1D9E75]">Configuración guardada.</p>}

          <Button type="submit" disabled={updateSettings.isPending} className="self-start">
            {updateSettings.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
