"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  AlarmClockOff,
  ArrowRight,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
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
  Moon,
  Pencil,
  Sun,
  Tag,
  Ticket,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { OrganizerPicker } from "@/features/events/components/OrganizerPicker";
import { useUpdateEvent } from "@/features/events/hooks/useUpdateEvent";
import { PUBLISH_PLAN_OPTIONS, type PublishPlan } from "@/features/events/lib/publishPlans";
import { eventFormSchema, type EventFormValues } from "@/features/events/schemas/event-schema";
import { EVENT_CATEGORIES, type Event, type EventCreateInput, type TicketType } from "@/features/events/types";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const TIME_OF_DAY_OPTIONS: { value: "nocturno" | "diurno"; label: string; icon: LucideIcon }[] = [
  { value: "nocturno", label: "Nocturno", icon: Moon },
  { value: "diurno", label: "Diurno", icon: Sun },
];

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
  /** Plan de publicación con el que arranca el formulario (ej. al volver desde el resumen). */
  initialPlan?: PublishPlan;
  onSuccess?: (event: Event) => void;
  /** Modo create: en vez de publicar, pasa los datos cargados + plan elegido al resumen. */
  onContinue?: (payload: EventCreateInput, plan: PublishPlan) => void;
}

export function EventForm({
  mode = "create",
  eventId,
  initialValues,
  initialPlan,
  onSuccess,
  onContinue,
}: EventFormProps) {
  const updateEvent = useUpdateEvent(eventId ?? "");
  const { data: currentUser } = useCurrentUser();

  const [timeOfDay, setTimeOfDay] = useState<"nocturno" | "diurno">(initialValues?.moment ?? "nocturno");
  const [plan, setPlan] = useState<PublishPlan>(initialPlan ?? "dest");
  const [organizerId, setOrganizerId] = useState<string | undefined>(undefined);
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
      moment: "nocturno",
      category: undefined,
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
  const category = watch("category");

  async function onSubmit(values: EventFormValues) {
    const payload: EventCreateInput = {
      title: values.title,
      description: values.description || undefined,
      date: values.date,
      time: values.time,
      time_end: values.time_end || undefined,
      moment: timeOfDay,
      category: values.category,
      location_name: values.location_name,
      location_address: values.location_address,
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

    // El evento todavía no se publica acá — el resumen decide si va directo
    // a /api/events (plan gratis) o a la pantalla de pago (plan pago).
    onContinue?.(payload, plan);
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
          Categoría
        </FieldLabel>
        <Select value={category} onValueChange={(value) => setValue("category", value, { shouldValidate: true })}>
          <SelectTrigger id="category" aria-label="Categoría">
            <SelectValue placeholder="Elegí una categoría" />
          </SelectTrigger>
          <SelectContent>
            {EVENT_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={errors.category?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <FieldLabel icon={Clock} required>
          Momento del evento
        </FieldLabel>
        <ToggleGrid
          options={TIME_OF_DAY_OPTIONS}
          value={timeOfDay}
          onChange={(value) => {
            setTimeOfDay(value);
            setValue("moment", value, { shouldValidate: true });
          }}
          columns={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <FieldLabel icon={Calendar} htmlFor="date" required>
            Fecha
          </FieldLabel>
          <Input id="date" type="date" {...register("date")} />
          <FieldError message={errors.date?.message} />
        </div>
        <div className="flex flex-col gap-1">
          <FieldLabel icon={Clock} htmlFor="time" required>
            Hora inicio
          </FieldLabel>
          <Input id="time" type="time" {...register("time")} />
          <FieldError message={errors.time?.message} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <FieldLabel icon={AlarmClockOff} htmlFor="time_end">
          Hora fin (opc.)
        </FieldLabel>
        <Input id="time_end" type="time" {...register("time_end")} />
      </div>

      <div className="flex flex-col gap-1">
        <FieldLabel icon={Building2} htmlFor="location_name" required>
          Nombre del lugar
        </FieldLabel>
        <Input id="location_name" {...register("location_name")} placeholder="Ej: El Tinglado Bar" />
        <FieldError message={errors.location_name?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <FieldLabel icon={MapPin} htmlFor="location_address" required>
          Dirección
        </FieldLabel>
        <Input id="location_address" {...register("location_address")} placeholder="Ej: Av. Roca 1240" />
        <FieldError message={errors.location_address?.message} />
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

      {/* Plan de publicación: aún no existe en el modelo/EventCreate, ver informe de campos faltantes */}
      <div className="flex flex-col gap-2">
        <FieldLabel icon={Crown}>Elegí tu plan</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {PUBLISH_PLAN_OPTIONS.map((option) => {
            const Icon = option.icon;
            const on = plan === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setPlan(option.value)}
                className={cn(
                  "flex flex-col gap-0.5 rounded-xl border p-3 text-left transition-colors",
                  on ? "border-primary bg-brand-pinkBg" : "border-border bg-card hover:border-primary/40",
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                  {option.label}
                </span>
                <span className="text-xs font-bold text-primary">{option.price}</span>
                <span className="text-[11px] leading-snug text-ink-4">{option.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

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
