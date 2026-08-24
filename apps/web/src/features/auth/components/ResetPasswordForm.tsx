"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useResetPassword } from "@/features/auth/hooks/useResetPassword";
import { resetPasswordFormSchema, type ResetPasswordFormValues } from "@/features/auth/schemas/auth-schema";
import { ApiError } from "@/lib/api-client";

interface FieldErrorProps {
  message?: string;
}

function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const resetPassword = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  async function onSubmit(values: ResetPasswordFormValues) {
    await resetPassword.mutateAsync({ token, new_password: values.new_password });
  }

  if (resetPassword.isSuccess) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
          Tu contraseña se actualizó correctamente.
        </p>
        <Link href="/login" className="self-start text-sm font-semibold text-primary hover:underline">
          Ir a iniciar sesión →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1">
        <Label htmlFor="new_password" className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-3">
          <Lock className="h-3 w-3 text-primary" aria-hidden />
          Nueva contraseña
        </Label>
        <PasswordInput id="new_password" {...register("new_password")} placeholder="Mínimo 8 caracteres" />
        <FieldError message={errors.new_password?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="confirm_password" className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-3">
          <Lock className="h-3 w-3 text-primary" aria-hidden />
          Confirmar contraseña
        </Label>
        <PasswordInput id="confirm_password" {...register("confirm_password")} placeholder="Repetí la contraseña" />
        <FieldError message={errors.confirm_password?.message} />
      </div>

      {resetPassword.isError && (
        <p className="text-sm text-destructive">
          {resetPassword.error instanceof ApiError ? resetPassword.error.message : "No pudimos cambiar la contraseña."}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-xl text-base">
        {isSubmitting ? "Cambiando..." : "Cambiar contraseña"}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </form>
  );
}
