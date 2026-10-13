"use client";

import { CheckCircle2, Globe2, MapPin, Plus } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCities } from "@/features/auth/hooks/useCities";
import { ConfirmDialog } from "@/features/admin/components/ConfirmDialog";
import { LocationForm } from "@/features/admin/components/LocationForm";
import { useSetGastroPlan } from "@/features/gastro/hooks/useAdminGastro";
import { useGastroTypeCatalog } from "@/features/gastro/hooks/useGastroTypeCatalog";
import { GASTRO_TYPE_LABELS, type GastroPlan } from "@/features/gastro/types";
import { useAdminLocations } from "@/features/locations/hooks/useAdminLocations";
import { useDeleteAdminLocation } from "@/features/locations/hooks/useDeleteAdminLocation";
import { useUpdateAdminLocation } from "@/features/locations/hooks/useUpdateAdminLocation";
import { useVerifyAdminLocation } from "@/features/locations/hooks/useVerifyAdminLocation";
import type { AdminLocation, AdminLocationGrupoFilter } from "@/features/locations/types";
import { ApiError } from "@/lib/api-client";

const PLAN_OPTIONS: { value: GastroPlan; label: string }[] = [
  { value: "gratis", label: "Gratis" },
  { value: "dest", label: "Destacado" },
  { value: "pro", label: "Destacado Plus" },
];

const GRUPO_FILTER_OPTIONS: { value: AdminLocationGrupoFilter; label: string }[] = [
  { value: "gastro", label: "Gastronomía" },
  { value: "espacios", label: "Espacios" },
  { value: "none", label: "Sin tipo (solo eventos)" },
];

interface LocationRowProps {
  location: AdminLocation;
  typeNames: Map<string, string>;
  onEdit: (location: AdminLocation) => void;
}

function LocationRow({ location, typeNames, onEdit }: LocationRowProps) {
  const verify = useVerifyAdminLocation();
  const update = useUpdateAdminLocation(location.id);
  const setPlan = useSetGastroPlan();
  const deleteLocation = useDeleteAdminLocation();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleteError(null);
    try {
      await deleteLocation.mutateAsync(location.id);
      setConfirmingDelete(false);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "No pudimos eliminar el lugar.");
    }
  }

  return (
    <div data-testid="admin-location-row" className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-foreground">{location.name}</p>
          <p className="text-xs text-ink-4">{location.address}</p>
          <p className="text-xs text-ink-5">{location.city_name}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {location.is_gastro && location.plan === "pro" && <Badge variant="pro">Destacado Plus</Badge>}
          {location.is_gastro && location.plan === "dest" && <Badge>Destacado</Badge>}
          {location.is_verified && <Badge>Verificado</Badge>}
          {location.is_public ? <Badge variant="pro">Público</Badge> : <Badge variant="muted">Privado</Badge>}
          {!location.is_active && <Badge variant="muted">Inactivo</Badge>}
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {location.gastro_types.length === 0 ? (
          <span className="rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] font-bold text-ink-4">
            Sin tipo · solo eventos
          </span>
        ) : (
          location.gastro_types.map((t) => (
            <span key={t} className="rounded-full bg-surface-5 px-2 py-0.5 text-[10px] font-bold text-ink-3">
              {typeNames.get(t) ?? GASTRO_TYPE_LABELS[t] ?? t}
            </span>
          ))
        )}
      </div>

      <p className="text-xs text-ink-4">
        {location.event_count} evento{location.event_count === 1 ? "" : "s"} asociado{location.event_count === 1 ? "" : "s"}
      </p>

      {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => onEdit(location)}>
          Editar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={verify.isPending}
          onClick={() => verify.mutate({ locationId: location.id, isVerified: !location.is_verified })}
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          {location.is_verified ? "Desverificar" : "Verificar"}
        </Button>
        {!location.is_public && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={update.isPending}
            onClick={() => update.mutate({ is_public: true })}
          >
            <Globe2 className="h-3.5 w-3.5" aria-hidden />
            Hacer público
          </Button>
        )}
        {/* El plan solo aplica a lugares que aparecen en Gastronomía/Espacios. */}
        {location.is_gastro && (
          <Select
            value={location.plan}
            onValueChange={(value) => setPlan.mutate({ id: location.id, plan: value as GastroPlan })}
          >
            <SelectTrigger aria-label={`Plan de ${location.name}`} className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAN_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={update.isPending}
          onClick={() => update.mutate({ is_active: !location.is_active })}
        >
          {location.is_active ? "Desactivar" : "Activar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingDelete(true)}>
          Eliminar
        </Button>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Eliminar lugar"
          description={`¿Seguro que querés eliminar "${location.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          isConfirming={deleteLocation.isPending}
          onConfirm={handleDelete}
          onClose={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}

/**
 * Panel admin unificado de Lugares — Etapa "Unificar panel admin de
 * Lugares". Fusiona el panel genérico de Lugares (Etapa 7b) y el de
 * Gastronomía (Etapa 8e): un solo listado y un solo formulario para
 * lugares de eventos, Gastronomía y Espacios.
 */
export function AdminLocationsPanel() {
  const { data: cities } = useCities();
  const { types } = useGastroTypeCatalog();
  const [cityId, setCityId] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState("");
  const [isPublicFilter, setIsPublicFilter] = useState("");
  const [grupoFilter, setGrupoFilter] = useState("");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingLocation, setEditingLocation] = useState<AdminLocation | null>(null);

  const { data: locations, isLoading, isError } = useAdminLocations({
    city_id: cityId || undefined,
    is_active: isActiveFilter === "" ? undefined : isActiveFilter === "true",
    is_public: isPublicFilter === "" ? undefined : isPublicFilter === "true",
    grupo: (grupoFilter || undefined) as AdminLocationGrupoFilter | undefined,
    search: search || undefined,
  });

  const typeNames = new Map(types.map((t) => [t.key, t.name]));
  const showForm = creating || editingLocation;

  function closeForm() {
    setCreating(false);
    setEditingLocation(null);
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-lg font-bold text-foreground">Lugares</h2>
        {!showForm && (
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Nuevo lugar
          </Button>
        )}
      </div>

      {showForm && (
        <LocationForm
          // key: al pasar de editar un lugar a otro, el form se remonta con su estado inicial.
          key={editingLocation?.id ?? "new"}
          location={editingLocation ?? undefined}
          onSaved={closeForm}
          onCancel={closeForm}
        />
      )}

      {!showForm && (
        <>
          <div className="flex flex-wrap gap-2">
            <Select value={cityId || undefined} onValueChange={setCityId}>
              <SelectTrigger aria-label="Filtrar por ciudad" className="w-40">
                <SelectValue placeholder="Todas las ciudades" />
              </SelectTrigger>
              <SelectContent>
                {(cities ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.emoji} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={grupoFilter || undefined} onValueChange={setGrupoFilter}>
              <SelectTrigger aria-label="Filtrar por tipo" className="w-48">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                {GRUPO_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={isActiveFilter || undefined} onValueChange={setIsActiveFilter}>
              <SelectTrigger aria-label="Filtrar por estado" className="w-40">
                <SelectValue placeholder="Activos e inactivos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Solo activos</SelectItem>
                <SelectItem value="false">Solo inactivos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={isPublicFilter || undefined} onValueChange={setIsPublicFilter}>
              <SelectTrigger aria-label="Filtrar por visibilidad" className="w-40">
                <SelectValue placeholder="Público y privado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Solo públicos</SelectItem>
                <SelectItem value="false">Solo privados</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o dirección..."
              className="min-w-[200px] flex-1"
            />
          </div>

          {isLoading && (
            <div data-testid="admin-locations-loading" className="flex flex-col gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {isError && (
            <p role="alert" className="text-sm text-muted-foreground">
              No pudimos cargar los lugares. Intentá de nuevo más tarde.
            </p>
          )}

          {locations && locations.length === 0 && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              No hay lugares que coincidan con estos filtros.
            </p>
          )}

          {locations && locations.length > 0 && (
            <div className="flex flex-col gap-3">
              {locations.map((location) => (
                <LocationRow key={location.id} location={location} typeNames={typeNames} onEdit={setEditingLocation} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
