"use client";

import { Home, LayoutGrid, Plus, Store, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { cn } from "@/lib/utils";

interface NavTab {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  // Por defecto el tab se marca activo con pathname === href. Los tabs con
  // pantalla de detalle (ej. /lugares/{id}) necesitan un match más amplio.
  activeMatch?: (pathname: string) => boolean;
}

// Categorías todavía no tiene pantalla propia: ver a_revisar.md.
// "Gastronomía y otros" (seSALE_primario.html, id="bt-lugares") apunta a
// /lugares — habilitado desde la Etapa 9a (ABM completo desde la Etapa 8e).
const BASE_TABS: NavTab[] = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/categorias", label: "Categorías", icon: LayoutGrid, disabled: true },
  {
    href: "/lugares",
    label: "Gastronomía",
    icon: Store,
    activeMatch: (pathname) => pathname === "/lugares" || pathname.startsWith("/lugares/"),
  },
  { href: "/publicar", label: "Publicar", icon: Plus },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: currentUser } = useCurrentUser();

  const TABS: NavTab[] = [
    ...BASE_TABS,
    currentUser
      ? { href: "/mi-cuenta", label: "Mi cuenta", icon: User }
      : { href: "/login", label: "Ingresar", icon: User },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-around border-t border-border bg-surface-1 pb-4 pt-2.5">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = tab.activeMatch ? tab.activeMatch(pathname) : pathname === tab.href;

        if (tab.disabled) {
          return (
            <span
              key={tab.href}
              aria-disabled
              title="Próximamente"
              className="flex min-w-14 cursor-default flex-col items-center gap-0.5 px-2 text-ink-5"
            >
              <Icon className="h-[22px] w-[22px]" aria-hidden />
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </span>
          );
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex min-w-14 flex-col items-center gap-0.5 px-2",
              active ? "text-primary" : "text-ink-5",
            )}
          >
            <Icon className="h-[22px] w-[22px]" aria-hidden />
            <span className="text-[10px] font-semibold">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
