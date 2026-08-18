"use client";

import { CheckCircle2, MapPin, Plus } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCities } from "@/features/auth/hooks/useCities";
import { ConfirmDialog } from "@/features/admin/components/ConfirmDialog";
import { GastroForm } from "@/features/admin/components/GastroForm";
import {
  useAdminGastroPlaces,
  useDeleteGastroPlace,
  useSetGastroPlan,
  useUpdateGastroPlace,
  useVerifyGastroPlace,
} from "@/features/gastro/hooks/useAdminGastro";
import { GASTRO_TYPE_LABELS, type AdminGastroPlace, type GastroPlan } from "@/features/gastro/types";
import { ApiError } from "@/lib/api-client";

const PLAN_OPTIONS: { value: GastroPlan; label: string }[] = [
  { value: "gratis", label: "Gratis" },
  { value: "dest", label: "Destacado" },
  { value: "pro", label: "Destacado Plus" },
];

function GastroRow({ place, onEdit }: { place: AdminGastroPlace; onEdit: (place: AdminGastroPlace) => void }) {
  const verify = useVerifyGastroPlace();
  const setPlan = useSetGastroPlan();
  const toggleActive = useUpdateGastroPlace(place.id);
  const deletePlace = useDeleteGastroPlace();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleteError(null);
    try {
      await deletePlace.mutateAsync(place.id);
      setConfirmingDelete(false);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "No pudimos eliminar el lugar.");
    }
  }

  return (
    <div data-testid="admin-gastro-row" className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-foreground">{place.name}</p>
          <p className="text-xs text-ink-4">{place.address}</p>
          <p className="text-xs text-ink-5">{place.city_name}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {place.plan === "pro" && <Badge variant="pro">Destacado Plus</Badge>}
          {place.plan === "dest" && <Badge>Destacado</Badge>}
          {place.plan === "gratis" && <Badge variant="muted">Gratis</Badge>}
          {!place.is_active && <Badge variant="muted">Inactivo</Badge>}
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {place.gastro_types.map((t) => (
          <span key={t} className="rounded-full bg-surface-5 px-2 py-0.5 text-[10px] font-bold text-ink-3">
            {GASTRO_TYPE_LABELS[t] ?? t}
          </span>
        ))}
      </div>

      <p className="text-xs text-ink-4">
        {place.event_count} evento{place.event_count === 1 ? "" : "s"} próximo{place.event_count === 1 ? "" : "s"}
      </p>

      {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => onEdit(place)}>
          Editar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={verify.isPending}
          onClick={() => verify.mutate({ id: place.id, isVerified: !place.is_verified })}
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          {place.is_verified ? "Desverificar" : "Verificar"}
        </Button>
        <Select value={place.plan} onValueChange={(value) => setPlan.mutate({ id: place.id, plan: value as GastroPlan })}>
          <SelectTrigger aria-label={`Plan de ${place.name}`} className="h-8 w-36 text-xs">
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
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={toggleActive.isPending}
          onClick={() => toggleActive.mutate({ is_active: !place.is_active })}
        >
          {place.is_active ? "Desactivar" : "Activar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingDelete(true)}>
          Eliminar
        </Button>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Eliminar lugar gastronómico"
          description={`¿Seguro que querés eliminar "${place.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          isConfirming={deletePlace.isPending}
          onConfirm={handleDelete}
          onClose={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}

export function AdminGastroPanel() {
  const { data: cities } = useCities();
  const [cityId, setCityId] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState("");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingPlace, setEditingPlace] = useState<AdminGastroPlace | null>(null);

  const { data: places, isLoading, isError } = useAdminGastroPlaces({
    city_id: cityId || undefined,
    is_active: isActiveFilter === "" ? undefined : isActiveFilter === "true",
    search: search || undefined,
  });

  const showForm = creating || editingPlace;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-lg font-bold text-foreground">Gastronomía</h2>
        {!showForm && (
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Nuevo lugar
          </Button>
        )}
      </div>

      {showForm && (
        <GastroForm
          place={editingPlace ?? undefined}
          onSaved={() => {
            setCreating(false);
            setEditingPlace(null);
          }}
          onCancel={() => {
            setCreating(false);
            setEditingPlace(null);
          }}
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
            <Select value={isActiveFilter || undefined} onValueChange={setIsActiveFilter}>
              <SelectTrigger aria-label="Filtrar por estado" className="w-40">
                <SelectValue placeholder="Activos e inactivos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Solo activos</SelectItem>
                <SelectItem value="false">Solo inactivos</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre..."
              className="min-w-[200px] flex-1"
            />
          </div>

          {isLoading && (
            <div data-testid="admin-gastro-loading" className="flex flex-col gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {isError && (
            <p role="alert" className="text-sm text-muted-foreground">
              No pudimos cargar los lugares. Intentá de nuevo más tarde.
            </p>
          )}

          {places && places.length === 0 && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              No hay lugares que coincidan con estos filtros.
            </p>
          )}

          {places && places.length > 0 && (
            <div className="flex flex-col gap-3">
              {places.map((place) => (
                <GastroRow key={place.id} place={place} onEdit={setEditingPlace} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
