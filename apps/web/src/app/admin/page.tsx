"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Tabs } from "@/components/ui/tabs";
import { AdminAdsPanel } from "@/features/admin/components/AdminAdsPanel";
import { AdminCitiesPanel } from "@/features/admin/components/AdminCitiesPanel";
import { AdminEventsPanel } from "@/features/admin/components/AdminEventsPanel";
import { AdminFeaturedPanel } from "@/features/admin/components/AdminFeaturedPanel";
import { AdminGastroPanel } from "@/features/admin/components/AdminGastroPanel";
import { AdminLocationsPanel } from "@/features/admin/components/AdminLocationsPanel";
import { AdminReportsPanel } from "@/features/admin/components/AdminReportsPanel";
import { AdminSubscriptionsPanel } from "@/features/admin/components/AdminSubscriptionsPanel";
import { AdminUsersPanel } from "@/features/admin/components/AdminUsersPanel";

const ADMIN_TABS = [
  { value: "destacados", label: "Destacados" },
  { value: "eventos", label: "Eventos" },
  { value: "lugares", label: "Lugares" },
  { value: "gastronomia", label: "Gastronomía" },
  { value: "banners", label: "Banners" },
  { value: "ciudades", label: "Ciudades" },
  { value: "usuarios", label: "Usuarios" },
  { value: "suscripciones", label: "Suscripciones" },
  { value: "reportes", label: "Reportes" },
];

export default function AdminPage() {
  const [tab, setTab] = useState("destacados");
  // Etapa 9b: "Ver eventos del usuario" (panel Usuarios) cambia a la tab
  // Eventos con este filtro ya aplicado.
  const [eventsOrganizerFilter, setEventsOrganizerFilter] = useState<string | undefined>(undefined);

  function handleViewUserEvents(organizerId: string) {
    setEventsOrganizerFilter(organizerId);
    setTab("eventos");
  }

  return (
    <main className="container mx-auto flex max-w-2xl flex-col gap-6 py-6">
      <header className="flex flex-col gap-4">
        <Link href="/" className="flex items-center gap-3 border-b border-border pb-3 text-ink-3">
          <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
          <span className="text-sm font-medium">Volver</span>
        </Link>
        <h1 className="px-1 text-2xl font-black tracking-tight">Panel de administración</h1>
      </header>

      {/* Etapa 9e: admin/layout.tsx ya garantiza sesión + role="admin" antes
          de renderizar esta página — no hace falta repetir el chequeo acá. */}
      <Tabs tabs={ADMIN_TABS} value={tab} onChange={setTab} />

      {tab === "destacados" && <AdminFeaturedPanel />}
      {tab === "eventos" && <AdminEventsPanel initialOrganizerId={eventsOrganizerFilter} />}
      {tab === "lugares" && <AdminLocationsPanel />}
      {tab === "gastronomia" && <AdminGastroPanel />}
      {tab === "banners" && <AdminAdsPanel />}
      {tab === "ciudades" && <AdminCitiesPanel />}
      {tab === "usuarios" && <AdminUsersPanel onViewUserEvents={handleViewUserEvents} />}
      {tab === "suscripciones" && <AdminSubscriptionsPanel />}
      {tab === "reportes" && <AdminReportsPanel />}
    </main>
  );
}
