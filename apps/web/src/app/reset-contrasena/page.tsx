import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

interface ResetContrasenaPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetContrasenaPage({ searchParams }: ResetContrasenaPageProps) {
  const { token } = await searchParams;

  return (
    <main className="container mx-auto flex max-w-2xl flex-col gap-6 py-6">
      <header className="flex flex-col gap-4">
        <Link href="/login" className="flex items-center gap-3 border-b border-border pb-3 text-ink-3">
          <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
          <span className="text-sm font-medium">Volver a ingresar</span>
        </Link>
        <div className="flex flex-col gap-1 px-1">
          <h1 className="text-2xl font-black tracking-tight">Elegí tu nueva contraseña</h1>
          <p className="text-sm text-ink-4">Este link es válido por 1 hora desde que lo pediste.</p>
        </div>
      </header>

      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-destructive">
          Este link no es válido. Pedí uno nuevo desde{" "}
          <Link href="/recuperar-contrasena" className="font-semibold underline">
            recuperar contraseña
          </Link>
          .
        </p>
      )}
    </main>
  );
}
