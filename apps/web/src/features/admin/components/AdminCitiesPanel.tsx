"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminCities } from "@/features/cities/hooks/useAdminCities";
import { useCreateCity } from "@/features/cities/hooks/useCreateCity";
import { useToggleCity } from "@/features/cities/hooks/useToggleCity";
import { useUpdateCitySortOrder } from "@/features/cities/hooks/useUpdateCitySortOrder";
import type { AdminCity } from "@/features/cities/types";
import { ApiError } from "@/lib/api-client";

function CityForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const createCity = useCreateCity();
  const [name, setName] = useState("");
  const [province, setProvince] = useState("");
  const [emoji, setEmoji] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createCity.mutateAsync({
        name,
        province,
        emoji: emoji || undefined,
        latitude: latitude === "" ? undefined : Number(latitude),
        longitude: longitude === "" ? undefined : Number(longitude),
      });
      onSaved();
    } catch {
      // el error se muestra abajo, ver createCity.isError
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-bold text-foreground">Nueva ciudad</h3>

      <div className="flex flex-col gap-1">
        <Label htmlFor="city-name">Nombre *</Label>
        <Input id="city-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="city-province">Provincia *</Label>
        <Input id="city-province" value={province} onChange={(e) => setProvince(e.target.value)} required />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="city-emoji">Emoji</Label>
          <Input id="city-emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={10} placeholder="🏙️" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="city-lat">Latitud</Label>
          <Input
            id="city-lat"
            type="number"
            step="any"
            min={-90}
            max={90}
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="-38.9516"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="city-lng">Longitud</Label>
          <Input
            id="city-lng"
            type="number"
            step="any"
            min={-180}
            max={180}
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="-68.0591"
          />
        </div>
      </div>

      {createCity.isError && (
        <p role="alert" className="text-xs text-destructive">
          {createCity.error instanceof ApiError ? createCity.error.message : "No pudimos crear la ciudad."}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={createCity.isPending || !name || !province}>
          Guardar
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

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
  const [creating, setCreating] = useState(false);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-lg font-bold text-foreground">Ciudades</h2>
        {!creating && (
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Nueva ciudad
          </Button>
        )}
      </div>

      {creating && <CityForm onSaved={() => setCreating(false)} onCancel={() => setCreating(false)} />}

      {!creating && (
        <>
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
        </>
      )}
    </section>
  );
}
