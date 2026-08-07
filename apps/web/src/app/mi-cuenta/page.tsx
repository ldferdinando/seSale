"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { MyEventsView } from "@/features/events/components/MyEventsView";
import { AccountProfile, AccountProfileSkeleton } from "@/features/users/components/AccountProfile";

export default function MiCuentaPage() {
  const { data: currentUser, isLoading } = useCurrentUser();

  return (
    <main className="container mx-auto flex max-w-2xl flex-col gap-6 py-6">
      <header className="flex flex-col gap-4">
        <Link href="/" className="flex items-center gap-3 border-b border-border pb-3 text-ink-3">
          <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
          <span className="text-sm font-medium">Volver</span>
        </Link>
        <h1 className="px-1 text-2xl font-black tracking-tight">Mi cuenta</h1>
      </header>

      {isLoading && <AccountProfileSkeleton />}

      {!isLoading && !currentUser && (
        <p className="text-sm text-muted-foreground">
          Iniciá sesión para ver tu cuenta.{" "}
          <Link href="/login" className="font-semibold text-primary">
            Ingresar
          </Link>
        </p>
      )}

      {currentUser && <AccountProfile currentUser={currentUser} />}

      <section className="flex flex-col gap-4">
        <h2 className="px-1 text-lg font-bold text-foreground">Mis eventos</h2>
        <MyEventsView />
      </section>
    </main>
  );
}
