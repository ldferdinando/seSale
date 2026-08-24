"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Mail } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForgotPassword } from "@/features/auth/hooks/useForgotPassword";
import { forgotPasswordFormSchema, type ForgotPasswordFormValues } from "@/features/auth/schemas/auth-schema";
import { ApiError } from "@/lib/api-client";

interface FieldErrorProps {
  message?: string;
}

function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

/**
 * Etapa 10e — sin envío de email real todavía (Resend no está configurado):
 * el backend siempre devuelve 200 con el mismo mensaje, exista o no el
 * email, y solo en `environment=staging` incluye el token de recuperación
 * en la respuesta para poder probar el flujo completo sin bandeja de
 * entrada. En producción `reset_token` viene `null` y no se muestra nada
 * extra.
 */
export function ForgotPasswordForm() {
  const forgotPassword = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    await forgotPassword.mutateAsync(values);
  }

  if (forgotPassword.isSuccess) {
    const { message, reset_token } = forgotPassword.data;
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-foreground">{message}</p>
        {reset_token && (
          <div className="flex flex-col gap-1 rounded-lg bg-surface-5 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-3">
              Token temporal (solo en staging)
            </p>
            <p className="break-all font-mono text-sm text-foreground">{reset_token}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1">
        <Label htmlFor="email" className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-3">
          <Mail className="h-3 w-3 text-primary" aria-hidden />
          Email
        </Label>
        <Input id="email" type="email" {...register("email")} placeholder="tu@email.com" />
        <FieldError message={errors.email?.message} />
      </div>

      {forgotPassword.isError && (
        <p className="text-sm text-destructive">
          {forgotPassword.error instanceof ApiError
            ? forgotPassword.error.message
            : "No pudimos procesar la solicitud."}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-xl text-base">
        {isSubmitting ? "Solicitando..." : "Solicitar recuperación"}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </form>
  );
}
