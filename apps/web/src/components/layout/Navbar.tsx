"use client";

import { ChevronRight, LogOut, MapPin, Shield, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useLogout } from "@/features/auth/hooks/useLogout";

export function Navbar() {
  const { data: currentUser } = useCurrentUser();
  const router = useRouter();
  const logout = useLogout();

  async function handleLogout() {
    try {
      await logout.mutateAsync();
    } catch {
      // El estado local se limpia igual en onSettled de useLogout.
    }
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="relative min-h-[72px] overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-primary to-transparent" />
        <div className="container mx-auto flex min-h-[72px] max-w-2xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-foreground">se</span>
            <span className="text-xl font-black tracking-tight text-primary">SALE</span>
            <span className="mb-1 h-[7px] w-[7px] flex-shrink-0 animate-pulse rounded-full bg-primary" />
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sin ciudades cargadas desde el backend todavía: ver a_revisar.md */}
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-ink-2"
            >
              <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden />
              Gral. Roca
              <ChevronRight className="h-2.5 w-2.5 rotate-90" aria-hidden />
            </button>

            {!currentUser && (
              <>
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-bold text-foreground"
                >
                  Ingresar
                </Link>
                <Link
                  href="/registro"
                  className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground"
                >
                  Registrarse
                </Link>
              </>
            )}

            {currentUser && (
              <>
                <Link
                  href="/mi-cuenta"
                  className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-bold text-foreground"
                >
                  <User className="h-3.5 w-3.5 text-primary" aria-hidden />
                  {currentUser.public_name || currentUser.email}
                </Link>

                <Link
                  href="/publicar"
                  className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground"
                >
                  Publicar evento
                </Link>

                {currentUser.role === "admin" && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-bold text-foreground"
                  >
                    <Shield className="h-3.5 w-3.5 text-primary" aria-hidden />
                    Panel admin
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={logout.isPending}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-bold text-ink-2"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden />
                  Cerrar sesión
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
