"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaUpload } from "@/components/MediaUpload";
import { useSetGastroPlan } from "@/features/gastro/hooks/useAdminGastro";
import type { GastroPlan } from "@/features/gastro/types";
import type { AdminLocation } from "@/features/locations/types";
import { ApiError } from "@/lib/api-client";

const PLAN_OPTIONS: { value: GastroPlan; label: string }[] = [
  { value: "gratis", label: "Ninguno" },
  { value: "dest", label: "Destacado" },
  { value: "pro", label: "Destacado Plus" },
];

const DEFAULT_DURATION_DAYS = 30;

/** Siempre trabaja sobre la parte de fecha pura (YYYY-MM-DD), nunca
 * construye un `Date` desde el ISO completo: featured_from/featured_until
 * son fechas (un día calendario), no un instante — parsearlas como Date y
 * mostrarlas con el timezone local del navegador puede mostrar un día de
 * diferencia según dónde esté la persona que mira el panel. */
function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" → "DD/MM/YYYY", sin pasar por `Date` (ver nota arriba). */
function formatDateOnly(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

/** Fecha local del navegador en "YYYY-MM-DD" (no UTC): es el valor por
 * default que ve el admin, así que tiene que calzar con SU calendario. */
function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface LocationFeaturedModalProps {
  location: AdminLocation;
  onClose: () => void;
}

/**
 * Marcar/desmarcar un lugar como Destacado/Destacado Plus, con fechas de
 * vigencia y banner (solo Plus) — Etapa "Lugares destacados temporales".
 * `location.configured_plan`/`featured_from`/`featured_until` son los
 * valores crudos (no filtrados por vigencia, a diferencia de `plan`) — ver
 * schemas/location.py.
 *
 * `createPortal` a `document.body`: buena práctica general para que el
 * overlay quede siempre al tope del árbol, igual que lo haría cualquier
 * modal nuevo.
 *
 * El selector "Nivel" usa un `<select>` nativo, no el `<Select>` (Radix) del
 * resto del panel: ese componente abre su dropdown vía Portal, anclado
 * justo debajo del trigger — dentro de esta tarjeta de modal (chica, cerca
 * del borde inferior cuando no hay fechas/banner visibles) el dropdown
 * terminaba "escapando" por fuera de la tarjeta, sin que el collision
 * boundary de Radix (por default, el viewport, no la tarjeta) lo evitara.
 * Bug reportado ("no veo bien el popup"), confirmado en el navegador real.
 * Con solo 3 opciones fijas y sin búsqueda, un `<select>` nativo evita el
 * problema de raíz y sigue siendo accesible.
 */
export function LocationFeaturedModal({ location, onClose }: LocationFeaturedModalProps) {
  const setPlan = useSetGastroPlan();
  const today = todayDateString();

  const [plan, setPlanValue] = useState<GastroPlan>(location.configured_plan);
  const [featuredFrom, setFeaturedFrom] = useState(toDateInputValue(location.featured_from) || today);
  const [featuredUntil, setFeaturedUntil] = useState(
    toDateInputValue(location.featured_until) || addDays(today, DEFAULT_DURATION_DAYS),
  );
  const [bannerUrl, setBannerUrl] = useState(location.featured_banner_url);
  const [error, setError] = useState<string | null>(null);
  // El banner solo se puede subir contra un lugar que YA tiene plan="pro"
  // guardado en el backend (upload_location_featured_banner lo valida) — no
  // alcanza con haberlo elegido acá todavía. Se trackea aparte de `plan`
  // (que es el valor elegido en el <select>, no necesariamente guardado)
  // para saber cuándo habilitar el uploader. Bug reportado: "no veo la
  // imagen que subí" — se subía contra un plan que el backend todavía veía
  // como no-pro y la llamada fallaba en silencio para el flujo normal.
  const [persistedPlan, setPersistedPlan] = useState<GastroPlan>(location.configured_plan);

  const wasFeatured = location.configured_plan !== "gratis";
  const featuredUntilDate = location.featured_until ? toDateInputValue(location.featured_until) : null;
  const isExpired = wasFeatured && featuredUntilDate !== null && featuredUntilDate < today;

  function handlePlanChange(value: GastroPlan) {
    setPlanValue(value);
    // Al activar Destacado/Plus por primera vez (venía de "gratis" sin
    // fechas propias), precarga hoy → hoy+30 días; el admin las puede
    // ajustar antes de guardar.
    if (value !== "gratis" && !wasFeatured) {
      setFeaturedFrom(today);
      setFeaturedUntil(addDays(today, DEFAULT_DURATION_DAYS));
    }
  }

  async function handleSubmit() {
    setError(null);
    // Si recién ahora pasa a "pro" (antes no lo era en el backend), no se
    // cierra el modal al guardar: hace falta mantenerlo abierto para que
    // el uploader de banner, que requiere plan="pro" ya persistido, quede
    // habilitado a continuación.
    const activatingPro = plan === "pro" && persistedPlan !== "pro";
    try {
      await setPlan.mutateAsync({
        id: location.id,
        plan,
        featured_from: plan === "gratis" ? null : featuredFrom,
        featured_until: plan === "gratis" ? null : featuredUntil,
      });
      setPersistedPlan(plan);
      if (!activatingPro) onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar los cambios.");
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Destacado de ${location.name}`}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-sm flex-col gap-4 overflow-y-auto rounded-t-2xl bg-card p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-foreground">Destacado — {location.name}</h2>

        {isExpired && (
          <p className="rounded-lg bg-surface-3 px-3 py-2 text-xs font-semibold text-ink-3" data-testid="featured-expired-notice">
            {location.configured_plan === "pro" ? "Destacado Plus" : "Destacado"} (venció el{" "}
            {featuredUntilDate && formatDateOnly(featuredUntilDate)})
          </p>
        )}

        <div className="flex flex-col gap-1">
          <Label htmlFor="featured-plan">Nivel</Label>
          <select
            id="featured-plan"
            aria-label="Nivel de destacado"
            value={plan}
            onChange={(e) => handlePlanChange(e.target.value as GastroPlan)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {PLAN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {plan !== "gratis" && (
          <>
            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-1">
                <Label htmlFor="featured-from">Desde</Label>
                <Input
                  id="featured-from"
                  type="date"
                  value={featuredFrom}
                  onChange={(e) => setFeaturedFrom(e.target.value)}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <Label htmlFor="featured-until">Hasta</Label>
                <Input
                  id="featured-until"
                  type="date"
                  value={featuredUntil}
                  onChange={(e) => setFeaturedUntil(e.target.value)}
                />
              </div>
            </div>

            {plan === "pro" && persistedPlan === "pro" && (
              <MediaUpload
                type="featured-banner"
                entityId={location.id}
                currentUrl={bannerUrl}
                onUploadSuccess={setBannerUrl}
                onDeleteSuccess={() => setBannerUrl(null)}
              />
            )}
            {plan === "pro" && persistedPlan !== "pro" && (
              <p className="text-xs text-ink-4" data-testid="featured-banner-save-first-notice">
                Guardá primero el nivel "Destacado Plus" para poder subir el banner.
              </p>
            )}
          </>
        )}

        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
            {plan === persistedPlan ? "Cerrar" : "Cancelar"}
          </Button>
          <Button type="button" disabled={setPlan.isPending} onClick={handleSubmit} className="flex-1">
            {setPlan.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
