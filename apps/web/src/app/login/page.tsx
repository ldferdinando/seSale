import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { LoginForm } from "@/features/auth/components/LoginForm";

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

// Solo se acepta una ruta interna ("/algo") como redirect — nunca una URL
// absoluta ni "//algo" (protocol-relative), para no abrir un open redirect
// a partir de un query param que cualquiera puede armar a mano.
function safeRedirect(redirect: string | undefined): string | undefined {
  if (!redirect) return undefined;
  if (!redirect.startsWith("/") || redirect.startsWith("//")) return undefined;
  return redirect;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect } = await searchParams;
  const safeTarget = safeRedirect(redirect);
  const isFromPublicar = safeTarget?.startsWith("/publicar") ?? false;

  return (
    <main className="container mx-auto flex max-w-2xl flex-col gap-6 py-6">
      <header className="flex flex-col gap-4">
        <Link href="/" className="flex items-center gap-3 border-b border-border pb-3 text-ink-3">
          <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
          <span className="text-sm font-medium">Volver</span>
        </Link>
        <div className="flex flex-col gap-1 px-1">
          <h1 className="text-2xl font-black tracking-tight">Ingresar</h1>
          <p className="text-sm text-ink-4">
            Iniciá sesión para publicar y gestionar tus eventos.{" "}
            <Link href="/registro" className="font-semibold text-primary">
              ¿No tenés cuenta?
            </Link>
          </p>
        </div>
      </header>

      {isFromPublicar && (
        <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground">
          Para publicar un evento necesitás una cuenta.{" "}
          <Link href="/registro" className="font-semibold text-primary">
            Registrate gratis →
          </Link>
        </p>
      )}

      <LoginForm redirect={safeTarget} />
    </main>
  );
}
