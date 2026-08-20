"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useHasToken } from "@/features/auth/hooks/useHasToken";
import { useSessionRestoring } from "@/features/auth/hooks/useSessionRestoring";

// Etapa 9e — Opción B (verifica rol, no solo sesión): el middleware ya exige
// la cookie has_session para llegar hasta acá (ver middleware.ts), pero eso
// solo prueba que hubo una sesión en algún momento, no que el usuario sea
// admin — esa parte no se puede resolver en el edge (el rol viaja en el JWT,
// que el middleware no puede validar). Se resuelve acá, en el cliente, con
// useCurrentUser (que sí llama a /api/users/me con el access_token real).
//
// stillResolving cubre la carrera del refresh de página: al montar, el
// access_token todavía no está en memoria (vive solo ahí, nunca en
// localStorage) — sin esperar a que AuthProvider termine de intentar
// restaurarlo (useSessionRestoring) y a que useCurrentUser resuelva su
// fetch, un admin real sería expulsado a "/" por una fracción de segundo de
// carrera, no por falta de sesión.
//
// isPending (no isLoading/isFetching) es la pieza clave: apenas hasToken
// pasa a true, hay un instante donde la query todavía no arrancó el fetch
// (isFetching sigue en false esa misma vuelta de render) — isLoading/
// isFetching solos dejan pasar ese instante como "ya resuelto, sin
// usuario" y expulsarían a un admin real. isPending se mantiene true hasta
// que la query realmente tiene un resultado (éxito o error), sin importar
// si el fetch ya arrancó o no. Se combina con hasToken porque una query
// enabled:false (sin token, tras confirmar que no hay sesión) también
// queda "isPending" para siempre — ahí sí hay que dejar de esperar.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const restoringSession = useSessionRestoring();
  const hasToken = useHasToken();
  const { data: currentUser, isPending } = useCurrentUser();

  const stillResolving = restoringSession || (hasToken && isPending);
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
