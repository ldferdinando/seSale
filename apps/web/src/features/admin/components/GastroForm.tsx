"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaUpload } from "@/components/MediaUpload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCities } from "@/features/auth/hooks/useCities";
import { useCreateGastroPlace, useUpdateGastroPlace } from "@/features/gastro/hooks/useAdminGastro";
import { useGastroTypeCatalog } from "@/features/gastro/hooks/useGastroTypeCatalog";
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  type AdminGastroPlace,
  type GastroPlaceCreateInput,
  type OpeningHours,
} from "@/features/gastro/types";
import { ApiError } from "@/lib/api-client";

const MapPicker = dynamic(() => import("@/components/MapPicker").then((m) => m.MapPicker), { ssr: false });

const MIN_TYPES = 1;
const MAX_TYPES = 5;
const PRICE_RANGE_OPTIONS = ["$", "$$", "$$$"] as const;

function emptyOpeningHours(): OpeningHours {
  return Object.fromEntries(WEEKDAYS.map((day) => [day, null])) as OpeningHours;
}

interface GastroFormProps {
  place?: AdminGastroPlace;
  onSaved: () => void;
  onCancel: () => void;
}

export function GastroForm({ place, onSaved, onCancel }: GastroFormProps) {
  const { data: cities } = useCities();
  const createPlace = useCreateGastroPlace();
  const updatePlace = useUpdateGastroPlace(place?.id ?? "");

  const [name, setName] = useState(place?.name ?? "");
  const [cityId, setCityId] = useState(place?.city_id ?? "");
  const { types: gastroTypeOptions } = useGastroTypeCatalog();
  const [gastroTypes, setGastroTypes] = useState<string[]>(place?.gastro_types ?? []);
  const [description, setDescription] = useState(place?.description ?? "");
  const [hours, setHours] = useState(place?.hours ?? "");
  const [openingHours, setOpeningHours] = useState<OpeningHours>(place?.opening_hours ?? emptyOpeningHours());
  const [address, setAddress] = useState(place?.address ?? "");
  const [latitude, setLatitude] = useState<number | undefined>(place?.latitude ?? undefined);
  const [longitude, setLongitude] = useState<number | undefined>(place?.longitude ?? undefined);
  const [whatsapp, setWhatsapp] = useState(place?.gastro_whatsapp ?? "");
  const [instagram, setInstagram] = useState(place?.gastro_instagram ?? "");
  const [web, setWeb] = useState(place?.gastro_web ?? "");
  const [email, setEmail] = useState(place?.gastro_email ?? "");
  const [hasDelivery, setHasDelivery] = useState(place?.has_delivery ?? false);
  const [hasReservations, setHasReservations] = useState(place?.has_reservations ?? false);
  const [priceRange, setPriceRange] = useState(place?.price_range ?? "");
  const [isVerified, setIsVerified] = useState(place?.is_verified ?? false);
  const [coverImgUrl, setCoverImgUrl] = useState(place?.cover_img_url ?? null);

  const mutation = place ? updatePlace : createPlace;
  const selectedCity = (cities ?? []).find((c) => c.id === cityId);

  function toggleType(value: string) {
    setGastroTypes((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      if (prev.length >= MAX_TYPES) return prev;
      return [...prev, value];
    });
  }

  function toggleDayOpen(day: (typeof WEEKDAYS)[number], open: boolean) {
    setOpeningHours((prev) => ({
      ...prev,
      [day]: open ? { open: "09:00", close: "22:00" } : null,
    }));
  }

  function setDayTime(day: (typeof WEEKDAYS)[number], field: "open" | "close", value: string) {
    setOpeningHours((prev) => {
      const current = prev[day];
      if (!current) return prev;
      return { ...prev, [day]: { ...current, [field]: value } };
    });
  }

  const isFormValid = Boolean(name && address && cityId) && gastroTypes.length >= MIN_TYPES;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid) return;

    const payload: GastroPlaceCreateInput = {
      name,
      address,
      city_id: cityId,
      gastro_types: gastroTypes,
      description: description || undefined,
      hours: hours || undefined,
      opening_hours: openingHours,
      gastro_whatsapp: whatsapp || undefined,
      gastro_instagram: instagram || undefined,
      gastro_web: web || undefined,
      gastro_email: email || undefined,
      has_delivery: hasDelivery,
      has_reservations: hasReservations,
      price_range: (priceRange || null) as GastroPlaceCreateInput["price_range"],
      latitude,
      longitude,
      is_verified: isVerified,
    };

    try {
      if (place) {
        await updatePlace.mutateAsync(payload);
      } else {
        await createPlace.mutateAsync(payload);
      }
      onSaved();
    } catch {
      // el error se muestra abajo, ver mutation.isError
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-bold text-foreground">{place ? "Editar lugar gastronómico" : "Nuevo lugar gastronómico"}</h3>

      <div className="flex flex-col gap-1">
        <Label htmlFor="gastro-name">Nombre *</Label>
        <Input id="gastro-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="gastro-city">Ciudad *</Label>
        <Select value={cityId || undefined} onValueChange={setCityId}>
          <SelectTrigger id="gastro-city" aria-label="Ciudad">
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

      <div className="flex flex-col gap-2">
        <Label>
          Tipos gastronómicos * (entre {MIN_TYPES} y {MAX_TYPES})
        </Label>
        <div className="flex flex-wrap gap-2">
          {gastroTypeOptions.map((option) => {
            const checked = gastroTypes.includes(option.key);
            return (
              <label
                key={option.key}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink-2"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleType(option.key)}
                  disabled={!checked && gastroTypes.length >= MAX_TYPES}
                  className="h-3.5 w-3.5 accent-primary"
                />
                {option.emoji ? `${option.emoji} ` : ""}
                {option.name}
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="gastro-description">Descripción</Label>
        <Textarea id="gastro-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="gastro-hours-note">Notas de horario (texto libre)</Label>
        <Textarea id="gastro-hours-note" rows={2} value={hours} onChange={(e) => setHours(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Horarios por día</Label>
        {WEEKDAYS.map((day) => {
          const dayHours = openingHours[day];
          const open = dayHours !== null;
          return (
            <div key={day} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
              <label className="flex w-28 flex-shrink-0 items-center gap-1.5 text-xs font-semibold text-ink-2">
                <input
                  type="checkbox"
                  checked={open}
                  onChange={(e) => toggleDayOpen(day, e.target.checked)}
                  className="h-3.5 w-3.5 accent-primary"
                  data-testid={`gastro-day-toggle-${day}`}
                />
                {WEEKDAY_LABELS[day]}
              </label>
              <input
                type="time"
                value={dayHours?.open ?? ""}
                disabled={!open}
                onChange={(e) => setDayTime(day, "open", e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs disabled:opacity-40"
                data-testid={`gastro-day-open-${day}`}
              />
              <span className="text-xs text-ink-4">a</span>
              <input
                type="time"
                value={dayHours?.close ?? ""}
                disabled={!open}
                onChange={(e) => setDayTime(day, "close", e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs disabled:opacity-40"
                data-testid={`gastro-day-close-${day}`}
              />
            </div>
          );
        })}
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
        <Label htmlFor="gastro-address">Dirección *</Label>
        <Input id="gastro-address" value={address} onChange={(e) => setAddress(e.target.value)} required />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="gastro-whatsapp">WhatsApp</Label>
          <Input id="gastro-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="gastro-instagram">Instagram</Label>
          <Input id="gastro-instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="gastro-web">Sitio web</Label>
          <Input id="gastro-web" value={web} onChange={(e) => setWeb(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="gastro-email">Email</Label>
          <Input id="gastro-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={hasDelivery} onChange={(e) => setHasDelivery(e.target.checked)} className="h-4 w-4 accent-primary" />
          Delivery
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={hasReservations} onChange={(e) => setHasReservations(e.target.checked)} className="h-4 w-4 accent-primary" />
          Acepta reservas
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="gastro-price-range">Rango de precios</Label>
        <Select value={priceRange || undefined} onValueChange={setPriceRange}>
          <SelectTrigger id="gastro-price-range" aria-label="Rango de precios">
            <SelectValue placeholder="Sin especificar" />
          </SelectTrigger>
          <SelectContent>
            {PRICE_RANGE_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-2">
        <input type="checkbox" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} className="h-4 w-4 accent-primary" />
        Verificado
      </label>

      {/* Etapa 8e, PARTE 6c: la portada solo se puede subir editando un
          lugar ya creado (necesita el id) — no aparece en el alta. */}
      {place && (
        <MediaUpload
          type="cover"
          entityId={place.id}
          currentUrl={coverImgUrl}
          onUploadSuccess={setCoverImgUrl}
          onDeleteSuccess={() => setCoverImgUrl(null)}
        />
      )}

      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {mutation.error instanceof ApiError ? mutation.error.message : "No pudimos guardar el lugar."}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending || !isFormValid} className="flex-1">
          {mutation.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
