"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/features/auth/hooks/useLogin";
import { loginFormSchema, type LoginFormValues } from "@/features/auth/schemas/auth-schema";
import { ApiError } from "@/lib/api-client";

interface FieldErrorProps {
  message?: string;
}

function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function LoginForm() {
  const router = useRouter();
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      await login.mutateAsync(values);
    } catch {
      return;
    }
    router.push("/mis-eventos");
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

      <div className="flex flex-col gap-1">
        <Label htmlFor="password" className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-3">
          <Lock className="h-3 w-3 text-primary" aria-hidden />
          Contraseña
        </Label>
        <Input id="password" type="password" {...register("password")} placeholder="••••••••" />
        <FieldError message={errors.password?.message} />
      </div>

      {login.isError && (
        <p className="text-sm text-destructive">
          {login.error instanceof ApiError ? login.error.message : "No pudimos iniciar sesión."}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-xl text-base">
        {isSubmitting ? "Ingresando..." : "Ingresar"}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </form>
  );
}
