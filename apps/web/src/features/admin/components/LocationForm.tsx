"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { MediaUpload } from "@/components/MediaUpload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCities } from "@/features/auth/hooks/useCities";
import { LocationFeaturedModal } from "@/features/admin/components/LocationFeaturedModal";
import { useGastroTypeCatalog } from "@/features/gastro/hooks/useGastroTypeCatalog";
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  type GastroTypeGrupo,
  type OpeningHours,
  type PriceRange,
} from "@/features/gastro/types";
import { useCreateAdminLocation } from "@/features/locations/hooks/useCreateAdminLocation";
import { useUpdateAdminLocation } from "@/features/locations/hooks/useUpdateAdminLocation";
import type { AdminLocation, LocationAdminCreateInput } from "@/features/locations/types";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const MapPicker = dynamic(() => import("@/components/MapPicker").then((m) => m.MapPicker), { ssr: false });

const MAX_TYPES = 5;
const PRICE_RANGE_OPTIONS: PriceRange[] = ["$", "$$", "$$$"];

const GRUPO_LABELS: Record<GastroTypeGrupo, string> = {
  gastro: "Gastronomía",
  espacios: "Espacios",
};

function emptyOpeningHours(): OpeningHours {
  return Object.fromEntries(WEEKDAYS.map((day) => [day, null])) as OpeningHours;
}

interface RevealSectionProps {
  open: boolean;
  legend: string;
  testId: string;
  children: React.ReactNode;
}

/** Sección que aparece/desaparece con transición suave (grid-rows 0fr↔1fr +
 * opacidad) en vez de un salto brusco. Cerrada, el fieldset queda
 * `disabled` — sus inputs no se pueden enfocar ni tabular. */
function RevealSection({ open, legend, testId, children }: RevealSectionProps) {
  return (
    <div
      data-testid={testId}
      data-open={open}
      aria-hidden={!open}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="overflow-hidden">
        <fieldset disabled={!open} className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <legend className="px-1 text-xs font-bold uppercase tracking-wide text-ink-3">{legend}</legend>
          {children}
        </fieldset>
      </div>
    </div>
  );
}

interface LocationFormProps {
  location?: AdminLocation;
  onSaved: () => void;
  onCancel: () => void;
}

/**
 * Alta/edición unificada de lugares — Etapa "Unificar panel admin de
 * Lugares" (reemplaza al LocationForm genérico y al GastroForm).
 *
 * - Campos base + contacto: siempre visibles, para cualquier lugar.
 * - Tipos del catálogo (opcionales, máx. 5), agrupados en Gastronomía y
 *   Espacios. Sin tipos, el lugar solo se ofrece al publicar eventos.
 * - Con cualquier tipo (Gastronomía o Espacios): horarios por día, opcionales.
 * - Con un tipo de Gastronomía: precio, delivery, reservas y portada.
 */
export function LocationForm({ location, onSaved, onCancel }: LocationFormProps) {
  const { data: cities } = useCities();
  const { types: typeOptions } = useGastroTypeCatalog();
  const createLocation = useCreateAdminLocation();
  const updateLocation = useUpdateAdminLocation(location?.id ?? "");

  const [name, setName] = useState(location?.name ?? "");
  const [cityId, setCityId] = useState(location?.city_id ?? "");
  const [description, setDescription] = useState(location?.description ?? "");
  const [hours, setHours] = useState(location?.hours ?? "");
  const [address, setAddress] = useState(location?.address ?? "");
  const [latitude, setLatitude] = useState<number | undefined>(location?.latitude ?? undefined);
  const [longitude, setLongitude] = useState<number | undefined>(location?.longitude ?? undefined);
  const [gastroTypes, setGastroTypes] = useState<string[]>(location?.gastro_types ?? []);
  const [openingHours, setOpeningHours] = useState<OpeningHours>(location?.opening_hours ?? emptyOpeningHours());
  const [whatsapp, setWhatsapp] = useState(location?.gastro_whatsapp ?? "");
  const [instagram, setInstagram] = useState(location?.gastro_instagram ?? "");
  const [web, setWeb] = useState(location?.gastro_web ?? "");
  const [email, setEmail] = useState(location?.gastro_email ?? "");
  const [facebook, setFacebook] = useState(location?.gastro_facebook ?? "");
  const [phone, setPhone] = useState(location?.gastro_phone ?? "");
  const [hasDelivery, setHasDelivery] = useState(location?.has_delivery ?? false);
  const [hasReservations, setHasReservations] = useState(location?.has_reservations ?? false);
  const [priceRange, setPriceRange] = useState<string>(location?.price_range ?? "");
  const [coverImgUrl, setCoverImgUrl] = useState(location?.cover_img_url ?? null);
  const [isVerified, setIsVerified] = useState(location?.is_verified ?? false);
  const [isPublic, setIsPublic] = useState(location?.is_public ?? true);
  const [isActive, setIsActive] = useState(location?.is_active ?? true);
  const [editingFeatured, setEditingFeatured] = useState(false);

  const mutation = location ? updateLocation : createLocation;
  const selectedCity = (cities ?? []).find((c) => c.id === cityId);

  const grupoByKey = new Map(typeOptions.map((t) => [t.key, t.grupo]));
  const selectedGrupos = new Set(gastroTypes.map((key) => grupoByKey.get(key)).filter(Boolean));
  const hasAnyType = gastroTypes.length > 0;
  const hasGastroType = selectedGrupos.has("gastro");
  // La portada se sube contra el lugar ya guardado: el backend exige que el
  // lugar persistido tenga un tipo de Gastronomía, no alcanza con tildarlo.
  const savedHasGastroType = (location?.gastro_types ?? []).some((key) => grupoByKey.get(key) === "gastro");

  function toggleType(key: string) {
    setGastroTypes((prev) => {
      if (prev.includes(key)) return prev.filter((v) => v !== key);
      if (prev.length >= MAX_TYPES) return prev;
      return [...prev, key];
    });
  }

  function toggleDayOpen(day: (typeof WEEKDAYS)[number], open: boolean) {
    setOpeningHours((prev) => ({ ...prev, [day]: open ? { open: "09:00", close: "22:00" } : null }));
  }

  function setDayTime(day: (typeof WEEKDAYS)[number], field: "open" | "close", value: string) {
    setOpeningHours((prev) => {
      const current = prev[day];
      if (!current) return prev;
      return { ...prev, [day]: { ...current, [field]: value } };
    });
  }

  const isFormValid = Boolean(name && address && cityId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid) return;

    // Los campos de una sección oculta no se mandan con su valor en memoria:
    // el backend igual los resetea según los tipos (ver location_service).
    const payload: LocationAdminCreateInput = {
      name,
      address,
      city_id: cityId,
      gastro_types: gastroTypes,
      description: description || undefined,
      hours: hours || undefined,
      opening_hours: hasAnyType ? openingHours : null,
      gastro_whatsapp: whatsapp || null,
      gastro_instagram: instagram || null,
      gastro_web: web || null,
      gastro_email: email || null,
      gastro_facebook: facebook || null,
      gastro_phone: phone || null,
      has_delivery: hasGastroType && hasDelivery,
      has_reservations: hasGastroType && hasReservations,
      price_range: hasGastroType && priceRange ? (priceRange as PriceRange) : null,
      latitude,
      longitude,
      is_verified: isVerified,
    };

    try {
      if (location) {
        await updateLocation.mutateAsync({ ...payload, is_public: isPublic, is_active: isActive });
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
        <Label htmlFor="loc-description">Descripción</Label>
        <Textarea id="loc-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
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

      <div className="flex flex-col gap-1">
        <Label htmlFor="loc-hours-note">Notas de horario (texto libre)</Label>
        <Textarea id="loc-hours-note" rows={2} value={hours} onChange={(e) => setHours(e.target.value)} />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-foreground">Contacto</legend>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="loc-whatsapp">WhatsApp</Label>
            <Input id="loc-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="loc-instagram">Instagram</Label>
            <Input id="loc-instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="loc-web">Sitio web</Label>
            <Input id="loc-web" value={web} onChange={(e) => setWeb(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="loc-email">Email</Label>
            <Input id="loc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="loc-facebook">Facebook</Label>
            <Input id="loc-facebook" value={facebook} onChange={(e) => setFacebook(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="loc-phone">Teléfono</Label>
            <Input id="loc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">Tipos (opcional, hasta {MAX_TYPES})</legend>
        <p className="text-xs text-ink-4">
          Sin tipos, el lugar solo se ofrece al publicar eventos. Con un tipo aparece también en Gastronomía o
          Espacios.
        </p>
        {(["gastro", "espacios"] as const).map((grupo) => {
          const options = typeOptions.filter((t) => t.grupo === grupo);
          if (options.length === 0) return null;
          return (
            <div key={grupo} className="flex flex-col gap-1.5" data-testid={`loc-types-${grupo}`}>
              <span className="text-xs font-bold text-ink-3">{GRUPO_LABELS[grupo]}</span>
              <div className="flex flex-wrap gap-2">
                {options.map((option) => {
                  const checked = gastroTypes.includes(option.key);
                  return (
                    <label
                      key={option.key}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                        checked ? "border-primary bg-primary/10 text-primary" : "border-border text-ink-2",
                      )}
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
          );
        })}
      </fieldset>

      <RevealSection open={hasAnyType} legend="Horarios por día (opcional)" testId="loc-section-hours">
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
                  data-testid={`loc-day-toggle-${day}`}
                />
                {WEEKDAY_LABELS[day]}
              </label>
              <input
                type="time"
                aria-label={`Apertura ${WEEKDAY_LABELS[day]}`}
                value={dayHours?.open ?? ""}
                disabled={!open}
                onChange={(e) => setDayTime(day, "open", e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs disabled:opacity-40"
                data-testid={`loc-day-open-${day}`}
              />
              <span className="text-xs text-ink-4">a</span>
              <input
                type="time"
                aria-label={`Cierre ${WEEKDAY_LABELS[day]}`}
                value={dayHours?.close ?? ""}
                disabled={!open}
                onChange={(e) => setDayTime(day, "close", e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs disabled:opacity-40"
                data-testid={`loc-day-close-${day}`}
              />
            </div>
          );
        })}
      </RevealSection>

      <RevealSection open={hasGastroType} legend="Gastronomía" testId="loc-section-gastro">
        <div className="flex flex-col gap-1">
          <Label htmlFor="loc-price-range">Rango de precios</Label>
          <Select value={priceRange || undefined} onValueChange={setPriceRange}>
            <SelectTrigger id="loc-price-range" aria-label="Rango de precios">
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
          <input
            type="checkbox"
            checked={hasDelivery}
            onChange={(e) => setHasDelivery(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Delivery
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            checked={hasReservations}
            onChange={(e) => setHasReservations(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Acepta reservas
        </label>
        {location && savedHasGastroType ? (
          <MediaUpload
            type="cover"
            entityId={location.id}
            currentUrl={coverImgUrl}
            onUploadSuccess={setCoverImgUrl}
            onDeleteSuccess={() => setCoverImgUrl(null)}
          />
        ) : (
          <p className="text-xs text-ink-4">
            La foto de portada se sube después de guardar el lugar con un tipo de Gastronomía.
          </p>
        )}
      </RevealSection>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            checked={isVerified}
            onChange={(e) => setIsVerified(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Verificado
        </label>
        {location && (
          <>
            <label className="flex items-center gap-2 text-sm text-ink-2">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Público (visible en el selector de eventos y, con tipos, en Gastronomía/Espacios)
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Activo
            </label>
          </>
        )}
      </div>

      {location && location.is_gastro && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium text-foreground">Destacado</span>
            {location.configured_plan === "pro" && <Badge variant="pro">Destacado Plus</Badge>}
            {location.configured_plan === "dest" && <Badge>Destacado</Badge>}
            {location.configured_plan === "gratis" && <span className="text-xs text-ink-4">Ninguno</span>}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => setEditingFeatured(true)}>
            {location.configured_plan === "gratis" ? "Destacar" : "Editar"}
          </Button>
        </div>
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

      {editingFeatured && location && (
        <LocationFeaturedModal location={location} onClose={() => setEditingFeatured(false)} />
      )}
    </form>
  );
}
