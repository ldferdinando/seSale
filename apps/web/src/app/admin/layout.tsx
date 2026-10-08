"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStatus } from "@/features/auth/hooks/useAuthStatus";

// Etapa 9e — Opción B (verifica rol, no solo sesión): el middleware ya exige
// la cookie has_session para llegar hasta acá (ver middleware.ts), pero eso
// solo prueba que hubo una sesión en algún momento, no que el usuario sea
// admin — esa parte no se puede resolver en el edge (el rol viaja en el JWT,
// que el middleware no puede validar). Se resuelve acá, en el cliente, con
// useCurrentUser (que sí llama a /api/users/me con el access_token real).
//
// status "loading" cubre la carrera del refresh de página (ver
// useAuthStatus): sin esperarlo, un admin real sería expulsado a "/" por una
// fracción de segundo de carrera, no por falta de sesión.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status, user: currentUser } = useAuthStatus();

  const stillResolving = status === "loading";
  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    if (!stillResolving && !isAdmin) {
      router.replace("/");
    }
  }, [stillResolving, isAdmin, router]);

  if (stillResolving) {
    return (
      <main className="container mx-auto flex max-w-2xl flex-col gap-6 py-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </main>
    );
  }

  if (!isAdmin) return null;

  return <>{children}</>;
}
