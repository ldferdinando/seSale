"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCities } from "@/features/auth/hooks/useCities";
import { useCreateAdminLocation } from "@/features/locations/hooks/useCreateAdminLocation";
import { useUpdateAdminLocation } from "@/features/locations/hooks/useUpdateAdminLocation";
import { PLACE_TYPE_OPTIONS, type AdminLocation, type LocationAdminCreateInput } from "@/features/locations/types";
import { ApiError } from "@/lib/api-client";

const MapPicker = dynamic(() => import("@/components/MapPicker").then((m) => m.MapPicker), { ssr: false });

interface LocationFormProps {
  location?: AdminLocation;
  onSaved: () => void;
  onCancel: () => void;
}

export function LocationForm({ location, onSaved, onCancel }: LocationFormProps) {
  const { data: cities } = useCities();
  const createLocation = useCreateAdminLocation();
  const updateLocation = useUpdateAdminLocation(location?.id ?? "");

  const [name, setName] = useState(location?.name ?? "");
  const [cityId, setCityId] = useState(location?.city_id ?? "");
  const [placeType, setPlaceType] = useState(location?.place_type ?? "");
  const [description, setDescription] = useState(location?.description ?? "");
  const [hours, setHours] = useState(location?.hours ?? "");
  const [address, setAddress] = useState(location?.address ?? "");
  const [latitude, setLatitude] = useState<number | undefined>(location?.latitude ?? undefined);
  const [longitude, setLongitude] = useState<number | undefined>(location?.longitude ?? undefined);
  const [isVerified, setIsVerified] = useState(location?.is_verified ?? false);
  const [isPublic, setIsPublic] = useState(location?.is_public ?? true);

  const mutation = location ? updateLocation : createLocation;
  const selectedCity = (cities ?? []).find((c) => c.id === cityId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: LocationAdminCreateInput = {
      name,
      address,
      city_id: cityId,
      description: description || undefined,
      hours: hours || undefined,
      place_type: placeType || undefined,
      latitude,
      longitude,
      is_verified: isVerified,
    };

    try {
      if (location) {
        await updateLocation.mutateAsync({ ...payload, is_public: isPublic });
      } else {
        await createLocation.mutateAsync(payload);
      }
      onSaved();
    } catch {
      // el error se muestra abajo, ver mutation.isError
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-bold text-foreground">{location ? "Editar lugar" : "Nuevo lugar"}</h3>

      <div className="flex flex-col gap-1">
        <Label htmlFor="loc-name">Nombre *</Label>
        <Input id="loc-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="loc-city">Ciudad *</Label>
        <Select value={cityId || undefined} onValueChange={setCityId}>
          <SelectTrigger id="loc-city" aria-label="Ciudad">
            <SelectValue placeholder="Elegí una ciudad" />
          </SelectTrigger>
          <SelectContent>
            {(cities ?? [])
              .filter((c) => c.is_active)
              .map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="loc-type">Tipo de lugar</Label>
        <Select value={placeType || undefined} onValueChange={setPlaceType}>
          <SelectTrigger id="loc-type" aria-label="Tipo de lugar">
            <SelectValue placeholder="Elegí un tipo" />
          </SelectTrigger>
          <SelectContent>
            {PLACE_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="loc-description">Descripción</Label>
        <Textarea id="loc-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="loc-hours">Horarios</Label>
        <Textarea id="loc-hours" rows={2} value={hours} onChange={(e) => setHours(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Ubicación en el mapa</Label>
        <MapPicker
          latitude={latitude ?? null}
          longitude={longitude ?? null}
          onLocationSelect={({ latitude: lat, longitude: lng, address: foundAddress }) => {
            setLatitude(lat);
            setLongitude(lng);
            if (foundAddress) setAddress(foundAddress);
          }}
          fallbackCenter={
            selectedCity?.latitude != null && selectedCity?.longitude != null
              ? [selectedCity.latitude, selectedCity.longitude]
              : undefined
          }
          fallbackCityName={selectedCity?.name}
          heightClassName="h-[250px]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="loc-address">Dirección *</Label>
        <Input id="loc-address" value={address} onChange={(e) => setAddress(e.target.value)} required />
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} className="h-4 w-4 accent-primary" />
          Verificado
        </label>
        {location && (
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-4 w-4 accent-primary" />
            Público (visible en el selector del formulario de evento)
          </label>
        )}
      </div>

      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {mutation.error instanceof ApiError ? mutation.error.message : "No pudimos guardar el lugar."}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending || !name || !address || !cityId} className="flex-1">
          {mutation.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
