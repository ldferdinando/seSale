"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminCities } from "@/features/cities/hooks/useAdminCities";
import { useToggleCity } from "@/features/cities/hooks/useToggleCity";
import { useUpdateCitySortOrder } from "@/features/cities/hooks/useUpdateCitySortOrder";
import type { AdminCity } from "@/features/cities/types";
import { ApiError } from "@/lib/api-client";

function CityRow({ city }: { city: AdminCity }) {
  const toggle = useToggleCity();
  const updateSortOrder = useUpdateCitySortOrder();
  const [sortOrderInput, setSortOrderInput] = useState(String(city.sort_order));
  const [toggleError, setToggleError] = useState<string | null>(null);

  async function handleToggle() {
    setToggleError(null);
    try {
      await toggle.mutateAsync(city.id);
    } catch (err) {
      setToggleError(
        err instanceof ApiError ? err.message : "No pudimos actualizar el estado de la ciudad.",
      );
    }
  }

  function handleSortOrderBlur() {
    const parsed = Number(sortOrderInput);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed === city.sort_order) {
      setSortOrderInput(String(city.sort_order));
      return;
    }
    updateSortOrder.mutate({ cityId: city.id, sortOrder: parsed });
  }

  return (
    <div data-testid="admin-city-row" className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-foreground">
            {city.emoji} {city.name}
          </p>
          <p className="text-xs text-ink-4">{city.province}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={city.is_active}
          aria-label={city.is_active ? "Desactivar ciudad" : "Activar ciudad"}
          disabled={toggle.isPending}
          onClick={handleToggle}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            city.is_active ? "bg-[#1D9E75]" : "bg-surface-5"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              city.is_active ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-4">
        <span>
          Lat/Lng: {city.latitude ?? "—"} / {city.longitude ?? "—"}
        </span>
        <label className="flex items-center gap-1.5">
          Orden:
          <Input
            type="number"
            min={0}
            value={sortOrderInput}
            onChange={(e) => setSortOrderInput(e.target.value)}
            onBlur={handleSortOrderBlur}
            className="h-7 w-16 px-2"
            aria-label={`Orden de ${city.name}`}
          />
        </label>
        <Badge variant="muted">
          {city.active_events_count} evento{city.active_events_count === 1 ? "" : "s"} activo
          {city.active_events_count === 1 ? "" : "s"}
        </Badge>
      </div>

      {toggleError && (
        <p role="alert" className="text-xs text-destructive">
          {toggleError}
        </p>
      )}
    </div>
  );
}

export function AdminCitiesPanel() {
  const { data: cities, isLoading, isError } = useAdminCities();

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-lg font-bold text-foreground">Ciudades</h2>
      </div>

      {isLoading && (
        <div data-testid="admin-cities-loading" className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {isError && (
        <p role="alert" className="text-sm text-muted-foreground">
          No pudimos cargar las ciudades. Intentá de nuevo más tarde.
        </p>
      )}

      {cities && cities.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay ciudades cargadas.</p>
      )}

      {cities && cities.length > 0 && (
        <div className="flex flex-col gap-3">
          {cities.map((city) => (
            <CityRow key={city.id} city={city} />
          ))}
        </div>
      )}
    </section>
  );
}
