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
import { useAdminLocations } from "@/features/locations/hooks/useAdminLocations";
import { useDeleteAdminLocation } from "@/features/locations/hooks/useDeleteAdminLocation";
import { useUpdateAdminLocation } from "@/features/locations/hooks/useUpdateAdminLocation";
import { useVerifyAdminLocation } from "@/features/locations/hooks/useVerifyAdminLocation";
import { PLACE_TYPE_OPTIONS, type AdminLocation } from "@/features/locations/types";
import { ApiError } from "@/lib/api-client";

function LocationRow({ location, onEdit }: { location: AdminLocation; onEdit: (location: AdminLocation) => void }) {
  const verify = useVerifyAdminLocation();
  const promote = useUpdateAdminLocation(location.id);
  const deleteLocation = useDeleteAdminLocation();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const placeTypeLabel = PLACE_TYPE_OPTIONS.find((p) => p.value === location.place_type)?.label ?? location.place_type;

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
          {placeTypeLabel && <Badge variant="muted">{placeTypeLabel}</Badge>}
          {location.is_verified && <Badge>Verificado</Badge>}
          {location.is_public && <Badge variant="pro">Público</Badge>}
        </div>
      </div>

      <p className="text-xs text-ink-4">
        {location.event_count} evento{location.event_count === 1 ? "" : "s"} asociado{location.event_count === 1 ? "" : "s"}
      </p>

      {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}

      <div className="flex flex-wrap gap-2">
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
            disabled={promote.isPending}
            onClick={() => promote.mutate({ is_public: true })}
          >
            <Globe2 className="h-3.5 w-3.5" aria-hidden />
            Hacer público
          </Button>
        )}
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

export function AdminLocationsPanel() {
  const { data: cities } = useCities();
  const [cityId, setCityId] = useState<string>("");
  const [isPublicFilter, setIsPublicFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingLocation, setEditingLocation] = useState<AdminLocation | null>(null);

  const { data: locations, isLoading, isError } = useAdminLocations({
    city_id: cityId || undefined,
    is_public: isPublicFilter === "" ? undefined : isPublicFilter === "true",
    search: search || undefined,
  });

  const showForm = creating || editingLocation;

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
          location={editingLocation ?? undefined}
          onSaved={() => {
            setCreating(false);
            setEditingLocation(null);
          }}
          onCancel={() => {
            setCreating(false);
            setEditingLocation(null);
          }}
        />
      )}

      {!showForm && (
        <>
          <div className="flex flex-wrap gap-2">
            <Select value={cityId || undefined} onValueChange={(v) => setCityId(v)}>
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
            <Select value={isPublicFilter || undefined} onValueChange={(v) => setIsPublicFilter(v)}>
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
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
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
                <LocationRow key={location.id} location={location} onEdit={setEditingLocation} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
