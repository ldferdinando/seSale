"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { GoogleLoginButton } from "@/features/auth/components/GoogleLoginButton";
import { useGoogleLogin } from "@/features/auth/hooks/useGoogleLogin";
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

interface LoginFormProps {
  // Etapa 9e — cuando el middleware redirigió acá desde una ruta protegida
  // (?redirect=/publicar), volver ahí después del login en vez de al
  // destino de siempre ("/mis-eventos").
  redirect?: string;
}

export function LoginForm({ redirect }: LoginFormProps = {}) {
  const router = useRouter();
  const login = useLogin();
  const googleLogin = useGoogleLogin();
  const [googleError, setGoogleError] = useState<string | null>(null);

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
    router.push(redirect || "/mis-eventos");
  }

  async function handleGoogleCredential(credential: string) {
    setGoogleError(null);
    try {
      await googleLogin.mutateAsync(credential);
    } catch (err) {
      setGoogleError(err instanceof ApiError ? err.message : "No pudimos iniciar sesión con Google.");
      return;
    }
    router.push(redirect || "/mis-eventos");
  }

  return (
    <div className="flex flex-col gap-5">
      <GoogleLoginButton onCredential={handleGoogleCredential} />
      {googleError && <p className="text-sm text-destructive">{googleError}</p>}

      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-ink-4">
        <span className="h-px flex-1 bg-border" />O<span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1">
          <Label htmlFor="email" className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-ink-3">
            <Mail className="h-3 w-3 text-primary" aria-hidden />
            Email
          </Label>
          <Input id="email" type="email" {...register("email")} placeholder="tu@email.com" />
          <FieldError message={errors.email?.message} />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="password" className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-ink-3">
            <Lock className="h-3 w-3 text-primary" aria-hidden />
            Contraseña
          </Label>
          <PasswordInput id="password" {...register("password")} placeholder="••••••••" />
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

        <Link href="/recuperar-contrasena" className="self-center text-xs font-semibold text-primary hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </form>
    </div>
  );
}
