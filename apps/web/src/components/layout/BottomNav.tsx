"use client";

import { Home, LayoutGrid, MessageCircle, Plus, Store } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { PublishGateModal } from "@/features/events/components/PublishGateModal";
import { sesaleWhatsappHref } from "@/features/plans/lib/whatsapp";
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

// "Categorías" (seSALE.html id="bt-categorias") → /categorias, habilitado en la
// Etapa 13a: grilla de categorías activas + /categorias/{key} con eventos
// filtrados. "Gastronomía y otros" (id="bt-lugares") → /lugares, habilitado
// desde la Etapa 9a (ABM completo desde la Etapa 8e).
const TABS: NavTab[] = [
  { href: "/", label: "Inicio", icon: Home },
  {
    href: "/categorias",
    label: "Categorías",
    icon: LayoutGrid,
    activeMatch: (pathname) => pathname === "/categorias" || pathname.startsWith("/categorias/"),
  },
  {
    href: "/lugares",
    label: "Gastronomía",
    icon: Store,
    activeMatch: (pathname) => pathname === "/lugares" || pathname.startsWith("/lugares/"),
  },
  { href: "/publicar", label: "Publicar", icon: Plus },
];

/**
 * Etapa "Cambios de diseño TIPO B v2.2" (punto 4): tab "Publicar" — con
 * sesión activa salta directo a /publicar (el middleware igual protegería
 * la ruta, pero evita el ida-y-vuelta de un redirect); sin sesión, abre
 * `PublishGateModal` primero (aclara que navegar y publicar son gratis)
 * en vez de mandar directo a /login. En el HTML de referencia esto no
 * existía porque es estático sin sesión real — acá sí hay auth real.
 */
function PublishTab({ tab, active }: { tab: NavTab; active: boolean }) {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const [showGate, setShowGate] = useState(false);
  const Icon = tab.icon;

  function handleClick() {
    if (currentUser) {
      router.push(tab.href);
    } else {
      setShowGate(true);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn("flex min-w-14 flex-col items-center gap-0.5 px-2", active ? "text-primary" : "text-ink-5")}
      >
        <Icon className="h-[22px] w-[22px]" aria-hidden />
        <span className="text-[10px] font-semibold">{tab.label}</span>
      </button>

      {showGate && (
        <PublishGateModal
          onLogin={() => {
            setShowGate(false);
            router.push(`/login?redirect=${encodeURIComponent(tab.href)}`);
          }}
          onContinueBrowsing={() => setShowGate(false)}
        />
      )}
    </>
  );
}

/**
 * Etapa "Cambios de diseño TIPO B v2.2" (punto 4): quinto botón — pasa de
 * "Mi cuenta"/"Ingresar" a "Contactanos" (abre WhatsApp con
 * NEXT_PUBLIC_SESALE_WHATSAPP, mismo helper que el resto del frontend —
 * `sesaleWhatsappHref`). "Mi cuenta" seguía teniendo una función real más
 * allá de login/registro (perfil del usuario logueado) — no se elimina esa
 * pantalla ni su acceso: sigue disponible desde el Navbar (link con el
 * nombre del usuario). El acceso rápido a "Ingresar" para un usuario sin
 * sesión se cubre ahora desde el popup de "Publicar" (arriba). Ver
 * a_revisar.md sobre este conflicto y el trade-off.
 */
function ContactanosTab() {
  return (
    <a
      href={sesaleWhatsappHref("Hola! Tengo una consulta sobre seSALE")}
      target="_blank"
      rel="noreferrer"
      className="flex min-w-14 flex-col items-center gap-0.5 px-2 text-ink-5"
    >
      <MessageCircle className="h-[22px] w-[22px]" aria-hidden />
      <span className="text-[10px] font-semibold">Contactanos</span>
    </a>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 flex justify-around border-t border-border bg-surface-1 pb-4 pt-2.5",
        !isAdmin && "md:mx-auto md:max-w-[560px]",
      )}
    >
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

        if (tab.href === "/publicar") {
          return <PublishTab key={tab.href} tab={tab} active={active} />;
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

      <ContactanosTab />
    </nav>
  );
}
