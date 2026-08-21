"use client";

import { Check, ChevronRight, LogOut, MapPin, Shield, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCities } from "@/features/auth/hooks/useCities";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useLogout } from "@/features/auth/hooks/useLogout";
import type { City } from "@/features/auth/types";
import { useActiveCity } from "@/hooks/useActiveCity";

function CitySelector() {
  const { activeCity, isDetecting, setActiveCity, resetToDetected } = useActiveCity();
  const { data: cities } = useCities();
  const [open, setOpen] = useState(false);

  if (isDetecting || !activeCity) {
    return (
      <div
        data-testid="city-selector-skeleton"
        className="h-[27px] w-[92px] animate-pulse rounded-full border border-border bg-card"
        aria-hidden
      />
    );
  }

  function handleSelect(city: City) {
    setActiveCity(city);
    setOpen(false);
  }

  function handleDetect() {
    resetToDetected();
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-[7px] rounded-full border border-[#E91E8C55] bg-card px-3.5 py-2 text-[13px] font-semibold text-ink-2"
      >
        <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden />
        {activeCity.emoji} {activeCity.name.replace("General", "Gral.")}
        <ChevronRight className={`h-2.5 w-2.5 rotate-90 transition-transform ${open ? "-scale-y-100" : ""}`} aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Elegir ciudad"
          className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[180px] rounded-xl border border-border bg-card p-1.5 shadow-lg"
        >
          {(cities ?? []).map((city) => (
            <button
              key={city.id}
              type="button"
              role="menuitemradio"
              aria-checked={city.id === activeCity.id}
              onClick={() => handleSelect(city)}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-foreground hover:bg-surface-5"
            >
              <span className="flex items-center gap-1.5">
                <span aria-hidden>{city.emoji}</span>
                {city.name}
              </span>
              {city.id === activeCity.id && <Check className="h-3.5 w-3.5 text-primary" aria-hidden />}
            </button>
          ))}

          <div className="my-1 h-px bg-border" />

          <button
            type="button"
            onClick={handleDetect}
            className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-sm font-semibold text-primary hover:bg-surface-5"
          >
            📍 Detectar mi ubicación
          </button>
        </div>
      )}
    </div>
  );
}

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
      {/* Bug real reportado por la usuaria (Etapa 9b): este contenedor tenía
          overflow-hidden pensado solo para contener el fondo de puntos y la
          línea de degradé de abajo (ambos ya están pineados con inset-0 /
          inset-x-0 bottom-0, no necesitan overflow-hidden para no
          desbordar) — pero de paso clipeaba el dropdown de CitySelector
          (absolute, ~200px de alto) contra los ~72px de este contenedor,
          dejando visible solo una tira de ~40px del menú. El mecanismo del
          selector (abrir/elegir/persistir/refiltrar eventos) funcionaba
          bien — el problema era 100% visual, invisible en el árbol de
          accesibilidad (por eso el diagnóstico anterior, hecho sin abrir el
          navegador de verdad, no lo detectó). No agregar overflow-hidden
          acá de nuevo sin envolver únicamente los dos divs decorativos. */}
      <div className="relative min-h-[72px]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,.05) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-primary to-transparent" />
        <div className="container mx-auto flex min-h-[72px] max-w-2xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-foreground">se</span>
            <span className="text-xl font-black tracking-tight text-primary">SALE</span>
            <span className="mb-1 h-[7px] w-[7px] flex-shrink-0 animate-pulse rounded-full bg-primary" />
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <CitySelector />

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
