"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Tabs } from "@/components/ui/tabs";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { AdminEventsPanel } from "@/features/admin/components/AdminEventsPanel";
import { AdminFeaturedPanel } from "@/features/admin/components/AdminFeaturedPanel";
import { AdminReportsPanel } from "@/features/admin/components/AdminReportsPanel";
import { AdminSubscriptionsPanel } from "@/features/admin/components/AdminSubscriptionsPanel";
import { AdminUsersPanel } from "@/features/admin/components/AdminUsersPanel";

const ADMIN_TABS = [
  { value: "destacados", label: "Destacados" },
  { value: "eventos", label: "Eventos" },
  { value: "usuarios", label: "Usuarios" },
  { value: "suscripciones", label: "Suscripciones" },
  { value: "reportes", label: "Reportes" },
];

export default function AdminPage() {
  const [tab, setTab] = useState("destacados");
  const { data: currentUser, isLoading } = useCurrentUser();
  const isAdmin = currentUser?.role === "admin";

  return (
    <main className="container mx-auto flex max-w-2xl flex-col gap-6 py-6">
      <header className="flex flex-col gap-4">
        <Link href="/" className="flex items-center gap-3 border-b border-border pb-3 text-ink-3">
          <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
          <span className="text-sm font-medium">Volver</span>
        </Link>
        <h1 className="px-1 text-2xl font-black tracking-tight">Panel de administración</h1>
      </header>

      {!isLoading && !isAdmin && currentUser && (
        <p className="text-sm text-muted-foreground">No tenés permiso para ver esta sección.</p>
      )}

      {!isLoading && !isAdmin && !currentUser && (
        <p className="text-sm text-muted-foreground">
          Iniciá sesión como admin para acceder al panel.{" "}
          <Link href="/login" className="font-semibold text-primary">
            Ingresar
          </Link>
        </p>
      )}

      {isAdmin && (
        <>
          <Tabs tabs={ADMIN_TABS} value={tab} onChange={setTab} />

          {tab === "destacados" && <AdminFeaturedPanel />}
          {tab === "eventos" && <AdminEventsPanel />}
          {tab === "usuarios" && <AdminUsersPanel />}
          {tab === "suscripciones" && <AdminSubscriptionsPanel />}
          {tab === "reportes" && <AdminReportsPanel />}
        </>
      )}
    </main>
  );
}
