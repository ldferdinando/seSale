"use client";

import dynamic from "next/dynamic";
import { Building2, MapPin } from "lucide-react";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs } from "@/components/ui/tabs";
import { useLocation } from "@/features/locations/hooks/useLocation";
import { LocationPicker } from "@/features/locations/components/LocationPicker";
import type { Location } from "@/features/locations/types";

const MapPicker = dynamic(() => import("@/components/MapPicker").then((m) => m.MapPicker), { ssr: false });

const LOCATION_TABS = [
  { value: "preset", label: "Elegir lugar" },
  { value: "map", label: "Indicar en el mapa" },
];

export type EventLocationMode = "preset" | "map";

export interface EventLocationMapFields {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

interface EventLocationFieldProps {
  cityId: string | undefined;
  cityLatitude?: number | null;
  cityLongitude?: number | null;
  cityName?: string;
  mode: EventLocationMode;
  onModeChange: (mode: EventLocationMode) => void;
  locationId: string | undefined;
  onLocationIdChange: (id: string) => void;
  mapName: string;
  mapAddress: string;
  mapLatitude: number | undefined;
  mapLongitude: number | undefined;
  onMapChange: (fields: EventLocationMapFields) => void;
  locationIdError?: string;
  addressError?: string;
}

export function EventLocationField({
  cityId,
  cityLatitude,
  cityLongitude,
  cityName,
  mode,
  onModeChange,
  locationId,
  onLocationIdChange,
  mapName,
  mapAddress,
  mapLatitude,
  mapLongitude,
  onMapChange,
  locationIdError,
  addressError,
}: EventLocationFieldProps) {
  const [pickedLocation, setPickedLocation] = useState<Location | null>(null);
  // Prefill de edición: si ya hay un locationId (evento existente) pero
  // todavía no se picó nada en esta sesión del formulario, se trae el
  // detalle para mostrarlo (funciona con lugares públicos o privados).
  const { data: fetchedLocation } = useLocation(!pickedLocation ? locationId : undefined);
  const displayLocation = pickedLocation ?? fetchedLocation ?? null;

  useEffect(() => {
    // Si cambia el locationId desde afuera (ej. reset del form) y ya no
    // coincide con lo picado localmente, se limpia para no mostrar el viejo.
    if (pickedLocation && pickedLocation.id !== locationId) {
      setPickedLocation(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  const fallbackCenter: [number, number] | undefined =
    cityLatitude != null && cityLongitude != null ? [cityLatitude, cityLongitude] : undefined;

  return (
    <div className="flex flex-col gap-3">
      <Tabs tabs={LOCATION_TABS} value={mode} onChange={(value) => onModeChange(value as EventLocationMode)} />

      {mode === "preset" && (
        <div className="flex flex-col gap-3">
          <LocationPicker
            cityId={cityId}
            selectedLocationId={locationId}
            onSelect={(location) => {
              setPickedLocation(location);
              onLocationIdChange(location.id);
            }}
          />
          {locationIdError && <p className="text-xs text-destructive">{locationIdError}</p>}

          {displayLocation && (
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
              <div className="flex items-start gap-2">
                <Building2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" aria-hidden />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground">{displayLocation.name}</span>
                  <span className="text-xs text-ink-4">{displayLocation.address}</span>
                </div>
              </div>
              {displayLocation.description && (
                <p className="pl-5.5 text-xs text-ink-3">{displayLocation.description}</p>
              )}
              {displayLocation.latitude != null && displayLocation.longitude != null && (
                <MapPicker
                  latitude={displayLocation.latitude}
                  longitude={displayLocation.longitude}
                  onLocationSelect={() => {}}
                  readonly
                  heightClassName="h-[180px]"
                />
              )}
            </div>
          )}
        </div>
      )}

      {mode === "map" && (
        <div className="flex flex-col gap-3">
          <MapPicker
            latitude={mapLatitude ?? null}
            longitude={mapLongitude ?? null}
            onLocationSelect={({ latitude, longitude, address }) =>
              onMapChange({ latitude, longitude, address: address ?? mapAddress })
            }
            fallbackCenter={fallbackCenter}
            fallbackCityName={cityName}
          />

          <div className="flex flex-col gap-1">
            <Label htmlFor="location_map_name" className="text-[11px] font-bold uppercase tracking-wide text-ink-3">
              Nombre del lugar
            </Label>
            <Input
              id="location_map_name"
              value={mapName}
              onChange={(e) => onMapChange({ name: e.target.value })}
              placeholder="Ej: El Tinglado Bar"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="location_map_address" className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-3">
              <MapPin className="h-3 w-3 text-primary" aria-hidden />
              Dirección <em className="not-italic text-primary"> *</em>
            </Label>
            <Input
              id="location_map_address"
              value={mapAddress}
              onChange={(e) => onMapChange({ address: e.target.value })}
              placeholder="Ej: Av. Roca 1240"
            />
            {addressError && <p className="text-xs text-destructive">{addressError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
