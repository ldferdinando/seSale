"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  AlarmClockOff,
  ArrowRight,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Globe,
  Info,
  Instagram,
  LayoutGrid,
  Mail,
  MapPin,
  MapPinned,
  MessageCircle,
  Pencil,
  Tag,
  Ticket,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCities } from "@/features/auth/hooks/useCities";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { CategoryMultiSelect } from "@/features/events/components/CategoryMultiSelect";
import { EventLocationField } from "@/features/events/components/EventLocationField";
import { OrganizerPicker } from "@/features/events/components/OrganizerPicker";
import { TimePicker } from "@/features/events/components/TimePicker";
import { useUpdateEvent } from "@/features/events/hooks/useUpdateEvent";
import { eventFormSchema, type EventFormValues } from "@/features/events/schemas/event-schema";
import type { Event, EventCreateInput, TicketType } from "@/features/events/types";
import { useActiveCity } from "@/hooks/useActiveCity";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// Etapa 10b — default automático de "Hora fin": time_start + 1 hora, con
// wraparound si cruza medianoche (ver addOneHourWithWrap más abajo).
const AUTO_END_OFFSET_MINUTES = 60;

/** "HH:mm" + 1 hora, con wraparound (23:30 -> 00:30, crossesMidnight=true). */
function addOneHourWithWrap(hhmm: string): { time: string; crossesMidnight: boolean } {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + AUTO_END_OFFSET_MINUTES;
  const crossesMidnight = totalMinutes >= 24 * 60;
  const wrapped = totalMinutes % (24 * 60);
  const newHours = Math.floor(wrapped / 60);
  const newMinutes = wrapped % 60;
  return {
    time: `${String(newHours).padStart(2, "0")}:${String(newMinutes).padStart(2, "0")}`,
    crossesMidnight,
  };
}

/** "YYYY-MM-DD" + N días, mismo formato de vuelta. */
function addDaysIso(iso: string, days: number): string {
  return format(addDays(parseISO(iso), days), "yyyy-MM-dd");
}

const TICKET_TYPE_STYLES: { value: TicketType; label: string; icon: LucideIcon }[] = [
  { value: "gratis", label: "Gratis", icon: CheckCircle2 },
  { value: "pago", label: "Pago", icon: Banknote },
  { value: "anticipo", label: "Anticipo", icon: Tag },
];

interface FieldErrorProps {
  message?: string;
}

function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

interface FieldLabelProps {
  icon: LucideIcon;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}

function FieldLabel({ icon: Icon, htmlFor, required, children }: FieldLabelProps) {
  return (
    <Label htmlFor={htmlFor} className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-3">
      <Icon className="h-3 w-3 text-primary" aria-hidden />
      {children}
      {required && <em className="not-italic text-primary"> *</em>}
    </Label>
  );
}

interface ToggleGridProps<T extends string> {
  options: { value: T; label: string; icon: LucideIcon }[];
  value: T;
  onChange: (value: T) => void;
  columns?: 2 | 3;
}

function ToggleGrid<T extends string>({ options, value, onChange, columns = 2 }: ToggleGridProps<T>) {
  return (
    <div className={cn("grid gap-2", columns === 3 ? "grid-cols-3" : "grid-cols-2")}>
      {options.map((option) => {
        const Icon = option.icon;
        const on = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center transition-colors",
              on ? "bg-primary text-primary-foreground" : "bg-surface-5 text-ink-2 hover:bg-surface-6",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span className="text-xs font-semibold">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface AcquisitionCheckProps {
  icon: LucideIcon;
  iconColor?: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function AcquisitionCheck({ icon: Icon, iconColor, label, checked, onChange }: AcquisitionCheckProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-primary"
      />
      <Icon className="h-3.5 w-3.5" style={{ color: iconColor }} aria-hidden />
      {label}
    </label>
  );
}

interface EventFormProps {
  mode?: "create" | "edit";
  eventId?: string;
  initialValues?: Partial<EventFormValues>;
  onSuccess?: (event: Event) => void;
  /** Modo create: pasa los datos cargados al resumen — la visibilidad
   * (plan) se elige ahí, no en este formulario (Etapa 9b). */
  onContinue?: (payload: EventCreateInput) => void;
}

export function EventForm({
  mode = "create",
  eventId,
  initialValues,
  onSuccess,
  onContinue,
}: EventFormProps) {
  const updateEvent = useUpdateEvent(eventId ?? "");
  const { data: currentUser } = useCurrentUser();
  const { data: cities } = useCities();
  const { activeCity } = useActiveCity();

  const [organizerId, setOrganizerId] = useState<string | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  // Etapa 10b — mientras esto sea `false`, "Hora inicio" recalcula "Hora
  // fin" (+1h) y "Fecha fin" (+1 día si cruza medianoche) automáticamente.
  // Se pone en `true` apenas la persona toca "Hora fin" a mano, o de
  // entrada si el formulario ya traía un time_end cargado (editar/volver
  // del resumen) — no hay que pisarle un valor real ya elegido.
  const userModifiedTimeEnd = useRef(Boolean(initialValues?.time_end));
  const [acquisition, setAcquisition] = useState({
    whatsapp: true,
    instagram: Boolean(initialValues?.contact_instagram),
    web: Boolean(initialValues?.contact_web),
    email: Boolean(initialValues?.contact_email),
    onSite: initialValues?.available_on_site ?? true,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      date: "",
      time: "",
      time_end: "",
      date_end: "",
      categories: [],
      city_id: "",
      location_mode: "preset",
      location_id: "",
      location_name: "",
      location_address: "",
      ticket_type: "gratis",
      price_at_door: "",
      price_advance: "",
      available_on_site: true,
      contact_instagram: "",
      contact_web: "",
      contact_email: "",
      ...initialValues,
    },
  });

  const ticketType = watch("ticket_type");
  const categories = watch("categories");
  const dateValue = watch("date");
  const dateEndValue = watch("date_end");
  const timeValue = watch("time");
  const timeEndValue = watch("time_end");
  const cityIdValue = watch("city_id");
  const locationMode = watch("location_mode");
  const locationIdValue = watch("location_id");
  const locationNameValue = watch("location_name");
  const locationAddressValue = watch("location_address");
  const locationLatitudeValue = watch("location_latitude");
  const locationLongitudeValue = watch("location_longitude");

  const selectedCity = (cities ?? []).find((c) => c.id === cityIdValue);

  // Preselecciona la ciudad activa del usuario apenas está disponible — solo
  // si el formulario todavía no tiene una ciudad cargada (create sin
  // initialValues, o volviendo del resumen sin haberla tocado).
  useEffect(() => {
    if (!cityIdValue && activeCity) {
      setValue("city_id", activeCity.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCity]);

  // Etapa 10b — "Fecha fin" en relación a "Fecha inicio":
  // - Si "Fecha fin" todavía está vacía (bug real reportado: si se elige
  //   "Hora inicio" ANTES que "Fecha inicio", el efecto de más abajo no
  //   puede completarla porque todavía no hay fecha de referencia — queda
  //   vacía para siempre si no se corrige acá) y ya hay una hora de inicio
  //   cargada, se completa recién ahora con el mismo criterio que el
  //   efecto de "Hora inicio": mismo día, o el día siguiente si la hora de
  //   fin (auto o ya tocada a mano) "cruza medianoche" respecto a la de
  //   inicio.
  // - Si "Fecha fin" ya tenía un valor y quedó antes de la nueva "Fecha
  //   inicio", se corrige sola. Si ya estaba en o después, no se toca —
  //   puede haber sido elegida a propósito (evento de varios días).
  useEffect(() => {
    if (!dateValue) return;
    if (!dateEndValue) {
      if (timeValue && timeEndValue) {
        const crossesMidnight = timeEndValue < timeValue;
        setValue("date_end", crossesMidnight ? addDaysIso(dateValue, 1) : dateValue, { shouldValidate: true });
      }
      return;
    }
    if (dateEndValue < dateValue) {
      setValue("date_end", dateValue, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateValue]);

  // Etapa 10b — "Hora fin" (y, si corresponde, "Fecha fin") se recalculan
  // solos cada vez que cambia "Hora inicio", pero SOLO mientras la persona
  // no haya tocado "Hora fin" a mano (userModifiedTimeEnd.current). Cuando
  // time_start + 1h cruza medianoche, "Fecha fin" pasa a ser el día
  // siguiente de "Fecha inicio".
  useEffect(() => {
    if (!timeValue || userModifiedTimeEnd.current) return;
    const { time: nextTimeEnd, crossesMidnight } = addOneHourWithWrap(timeValue);
    setValue("time_end", nextTimeEnd, { shouldValidate: true });
    if (dateValue) {
      setValue("date_end", crossesMidnight ? addDaysIso(dateValue, 1) : dateValue, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeValue]);

  async function onSubmit(values: EventFormValues) {
    const payload: EventCreateInput = {
      title: values.title,
      description: values.description || undefined,
      date: values.date,
      time: values.time,
      time_end: values.time_end,
      date_end: values.date_end,
      categories: values.categories,
      city_id: values.city_id || undefined,
      ...(values.location_mode === "preset"
        ? { location_id: values.location_id || undefined }
        : {
            location_data: {
              name: values.location_name || undefined,
              address: values.location_address ?? "",
              city_id: values.city_id || activeCity?.id || "",
              latitude: values.location_latitude,
              longitude: values.location_longitude,
            },
          }),
      ticket_type: values.ticket_type,
      price_at_door: values.price_at_door ? Number(values.price_at_door) : undefined,
      price_advance: values.price_advance ? Number(values.price_advance) : undefined,
      available_on_site: acquisition.onSite,
      contact_instagram: acquisition.instagram ? values.contact_instagram || undefined : undefined,
      contact_web: acquisition.web ? values.contact_web || undefined : undefined,
      contact_email: acquisition.email ? values.contact_email || undefined : undefined,
      ...(mode === "create" && currentUser?.role === "admin" ? { organizer_id: organizerId } : {}),
    };

    if (mode === "edit") {
      let result: Event;
      try {
        result = await updateEvent.mutateAsync(payload);
      } catch {
        return;
      }
      onSuccess?.(result);
      return;
    }

    // El evento todavía no se publica acá — el resumen (EventPlanChooser)
    // es donde el organizador elige la visibilidad y recién ahí se llama a
    // POST /api/events (Etapa 9b).
    onContinue?.(payload);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      {mode === "create" && currentUser?.role === "admin" && (
        <OrganizerPicker value={organizerId} onChange={setOrganizerId} />
      )}

      <div className="flex flex-col gap-1">
        <FieldLabel icon={Pencil} htmlFor="title" required>
          Nombre del evento
        </FieldLabel>
        <Input id="title" {...register("title")} placeholder="Ej: Noche de Jazz en vivo" />
        <FieldError message={errors.title?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <FieldLabel icon={LayoutGrid} required>
          Categorías (hasta 3)
        </FieldLabel>
        <CategoryMultiSelect
          value={categories ?? []}
          onChange={(value) => setValue("categories", value, { shouldValidate: true })}
        />
        <FieldError message={errors.categories?.message} />
      </div>

      {/* Fecha y hora, inicio y fin, van juntas en dos columnas —
          layout de seSALE.html ("Inicio: [fecha][hora] -> Fin: [fecha][hora]"). */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <FieldLabel icon={Calendar} required>
            Fecha inicio
          </FieldLabel>
          <button
            id="date"
            type="button"
            aria-label="Fecha inicio"
            onClick={() => setShowCalendar((s) => !s)}
            className={cn(
              "flex h-9 items-center rounded-full border border-border bg-card px-4 text-left text-sm",
              dateValue ? "text-foreground" : "text-ink-5",
            )}
          >
            {dateValue ? format(parseISO(dateValue), "d MMM yyyy", { locale: es }) : "Elegir fecha"}
          </button>
          <FieldError message={errors.date?.message} />
        </div>
        <div className="flex flex-col gap-1">
          <FieldLabel icon={Calendar} htmlFor="date_end" required>
            Fecha fin
          </FieldLabel>
          <button
            id="date_end"
            type="button"
            aria-label="Fecha fin"
            onClick={() => setShowEndCalendar((s) => !s)}
            className={cn(
              "flex h-9 items-center rounded-full border border-border bg-card px-4 text-left text-sm",
              dateEndValue ? "text-foreground" : "text-ink-5",
            )}
          >
            {dateEndValue ? format(parseISO(dateEndValue), "d MMM yyyy", { locale: es }) : "Elegir fecha"}
          </button>
          <FieldError message={errors.date_end?.message} />
        </div>
      </div>

      {showCalendar && (
        <CalendarWidget
          selected={dateValue ? parseISO(dateValue) : undefined}
          onSelect={(day) => {
            setValue("date", format(day, "yyyy-MM-dd"), { shouldValidate: true });
            setShowCalendar(false);
          }}
        />
      )}

      {showEndCalendar && (
        <CalendarWidget
          selected={dateEndValue ? parseISO(dateEndValue) : undefined}
          onSelect={(day) => {
            setValue("date_end", format(day, "yyyy-MM-dd"), { shouldValidate: true });
            setShowEndCalendar(false);
          }}
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <FieldLabel icon={Clock} htmlFor="time" required>
            Hora inicio
          </FieldLabel>
          <TimePicker
            id="time"
            label="Hora inicio"
            value={timeValue}
            onChange={(value) => setValue("time", value, { shouldValidate: true })}
          />
          <FieldError message={errors.time?.message} />
        </div>
        <div className="flex flex-col gap-1">
          <FieldLabel icon={AlarmClockOff} htmlFor="time_end" required>
            Hora fin
          </FieldLabel>
          <TimePicker
            id="time_end"
            label="Hora fin"
            value={timeEndValue ?? ""}
            onChange={(value) => {
              userModifiedTimeEnd.current = true;
              setValue("time_end", value, { shouldValidate: true });
            }}
          />
          <FieldError message={errors.time_end?.message} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <FieldLabel icon={MapPin}>Ciudad del evento</FieldLabel>
        <Select value={cityIdValue || undefined} onValueChange={(value) => setValue("city_id", value)}>
          <SelectTrigger aria-label="Ciudad del evento">
            <SelectValue placeholder="Elegí una ciudad" />
          </SelectTrigger>
          <SelectContent>
            {(cities ?? [])
              .filter((city) => city.is_active)
              .map((city) => (
                <SelectItem key={city.id} value={city.id}>
                  {city.emoji} {city.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <FieldLabel icon={Building2} required>
          Lugar
        </FieldLabel>
        <EventLocationField
          cityId={cityIdValue || undefined}
          cityLatitude={selectedCity?.latitude ?? activeCity?.latitude}
          cityLongitude={selectedCity?.longitude ?? activeCity?.longitude}
          cityName={selectedCity?.name ?? activeCity?.name}
          mode={locationMode}
          onModeChange={(mode) => setValue("location_mode", mode, { shouldValidate: true })}
          locationId={locationIdValue || undefined}
          onLocationIdChange={(id) => setValue("location_id", id, { shouldValidate: true })}
          mapName={locationNameValue ?? ""}
          mapAddress={locationAddressValue ?? ""}
          mapLatitude={locationLatitudeValue}
          mapLongitude={locationLongitudeValue}
          onMapChange={(fields) => {
            if (fields.name !== undefined) setValue("location_name", fields.name);
            if (fields.address !== undefined) setValue("location_address", fields.address, { shouldValidate: true });
            if (fields.latitude !== undefined) setValue("location_latitude", fields.latitude);
            if (fields.longitude !== undefined) setValue("location_longitude", fields.longitude);
          }}
          locationIdError={errors.location_id?.message}
          addressError={errors.location_address?.message}
        />
      </div>

      <div className="flex flex-col gap-1">
        <FieldLabel icon={FileText} htmlFor="description">
          Descripción
        </FieldLabel>
        <Textarea id="description" rows={3} {...register("description")} placeholder="Contá de qué se trata..." />
        <FieldError message={errors.description?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <FieldLabel icon={Ticket} required>
          Tipo de entrada
        </FieldLabel>
        <ToggleGrid
          options={TICKET_TYPE_STYLES}
          value={ticketType}
          onChange={(value) => setValue("ticket_type", value, { shouldValidate: true })}
          columns={3}
        />
      </div>

      {ticketType !== "gratis" && (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink-2">
            <Info className="h-3.5 w-3.5 text-primary" aria-hidden />
            Información de entradas
          </p>

          <div className="flex flex-col gap-1">
            <FieldLabel icon={DollarSign} htmlFor="price_at_door">
              Precio en puerta
            </FieldLabel>
            <Input id="price_at_door" type="number" min={0} {...register("price_at_door")} placeholder="Ej: 3000" />
          </div>

          {ticketType === "anticipo" && (
            <div className="flex flex-col gap-1">
              <FieldLabel icon={Tag} htmlFor="price_advance">
                Precio anticipo
              </FieldLabel>
              <Input id="price_advance" type="number" min={0} {...register("price_advance")} placeholder="Ej: 2000" />
            </div>
          )}
          <FieldError message={errors.price_at_door?.message} />

          <div className="flex flex-col gap-2">
            <FieldLabel icon={MapPinned}>¿Dónde se consiguen?</FieldLabel>
            <p className="text-xs text-ink-4">Vos elegís el medio de contacto — seSALE no vende entradas.</p>

            {/* WhatsApp y "en el lugar" son solo un check por ahora: ver informe de campos faltantes */}
            <AcquisitionCheck
              icon={MessageCircle}
              iconColor="#25D366"
              label="WhatsApp del organizador"
              checked={acquisition.whatsapp}
              onChange={(checked) => setAcquisition((a) => ({ ...a, whatsapp: checked }))}
            />

            <AcquisitionCheck
              icon={Instagram}
              label="Instagram / redes sociales"
              checked={acquisition.instagram}
              onChange={(checked) => setAcquisition((a) => ({ ...a, instagram: checked }))}
            />
            {acquisition.instagram && (
              <div className="flex flex-col gap-1 pl-6">
                <FieldLabel icon={Instagram} htmlFor="contact_instagram">
                  Usuario de Instagram
                </FieldLabel>
                <Input id="contact_instagram" {...register("contact_instagram")} placeholder="@tuusuario" />
              </div>
            )}

            <AcquisitionCheck
              icon={Globe}
              label="Página web / ticketera externa"
              checked={acquisition.web}
              onChange={(checked) => setAcquisition((a) => ({ ...a, web: checked }))}
            />
            {acquisition.web && (
              <div className="flex flex-col gap-1 pl-6">
                <FieldLabel icon={Globe} htmlFor="contact_web">
                  Link
                </FieldLabel>
                <Input id="contact_web" type="url" {...register("contact_web")} placeholder="https://..." />
              </div>
            )}

            <AcquisitionCheck
              icon={Mail}
              label="Email de contacto"
              checked={acquisition.email}
              onChange={(checked) => setAcquisition((a) => ({ ...a, email: checked }))}
            />
            {acquisition.email && (
              <div className="flex flex-col gap-1 pl-6">
                <FieldLabel icon={Mail} htmlFor="contact_email">
                  Email
                </FieldLabel>
                <Input id="contact_email" type="email" {...register("contact_email")} placeholder="tu@email.com" />
                <FieldError message={errors.contact_email?.message} />
              </div>
            )}

            <AcquisitionCheck
              icon={MapPin}
              label="En el lugar / mapa el día del evento"
              checked={acquisition.onSite}
              onChange={(checked) => setAcquisition((a) => ({ ...a, onSite: checked }))}
            />
          </div>
        </div>
      )}

      {mode === "edit" && updateEvent.isError && (
        <p className="text-sm text-destructive">
          {updateEvent.error instanceof ApiError ? updateEvent.error.message : "No pudimos guardar el evento."}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-xl text-base">
        {isSubmitting ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Continuar"}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </form>
  );
}
