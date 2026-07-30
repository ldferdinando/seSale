"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateEvent } from "@/features/events/hooks/useCreateEvent";
import { useOrganizerId } from "@/features/events/hooks/useOrganizerId";
import { eventFormSchema, type EventFormValues } from "@/features/events/schemas/event-schema";
import { EVENT_CATEGORIES, TICKET_TYPE_OPTIONS } from "@/features/events/types";
import { ApiError } from "@/lib/api-client";

interface FieldErrorProps {
  message?: string;
}

function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function EventForm() {
  const { organizerId, setOrganizerId } = useOrganizerId();
  const createEvent = useCreateEvent();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      user_id: organizerId,
      title: "",
      description: "",
      date: "",
      time: "",
      category: undefined,
      location_name: "",
      location_address: "",
      ticket_type: "gratis",
      price_at_door: "",
      price_advance: "",
      contact_whatsapp: "",
      contact_instagram: "",
      contact_web: "",
      contact_email: "",
    },
  });

  useEffect(() => {
    if (organizerId) setValue("user_id", organizerId);
  }, [organizerId, setValue]);

  const ticketType = watch("ticket_type");
  const category = watch("category");

  async function onSubmit(values: EventFormValues) {
    setOrganizerId(values.user_id);
    try {
      await createEvent.mutateAsync({
        user_id: values.user_id,
        title: values.title,
        description: values.description || undefined,
        date: values.date,
        time: values.time,
        category: values.category,
        location_name: values.location_name,
        location_address: values.location_address,
        ticket_type: values.ticket_type,
        price_at_door: values.price_at_door ? Number(values.price_at_door) : undefined,
        price_advance: values.price_advance ? Number(values.price_advance) : undefined,
        contact_whatsapp: values.contact_whatsapp || undefined,
        contact_instagram: values.contact_instagram || undefined,
        contact_web: values.contact_web || undefined,
        contact_email: values.contact_email || undefined,
      });
    } catch {
      return;
    }
    reset({ ...values, title: "", description: "", date: "", time: "", location_name: "", location_address: "" });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1">
        <Label htmlFor="user_id">ID de organizador (temporal, sin login todavía)</Label>
        <Input id="user_id" {...register("user_id")} placeholder="UUID del organizador" />
        <FieldError message={errors.user_id?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="title">Título</Label>
        <Input id="title" {...register("title")} />
        <FieldError message={errors.title?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" {...register("description")} />
        <FieldError message={errors.description?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="category">Categoría</Label>
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

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="date">Fecha</Label>
          <Input id="date" type="date" {...register("date")} />
          <FieldError message={errors.date?.message} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="time">Hora</Label>
          <Input id="time" type="time" {...register("time")} />
          <FieldError message={errors.time?.message} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="location_name">Lugar</Label>
        <Input id="location_name" {...register("location_name")} placeholder="Ej: El Tinglado Bar" />
        <FieldError message={errors.location_name?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="location_address">Dirección</Label>
        <Input id="location_address" {...register("location_address")} placeholder="Ej: Av. Roca 1240" />
        <FieldError message={errors.location_address?.message} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Tipo de entrada</Label>
        <RadioGroup
          name="ticket_type"
          value={ticketType}
          options={TICKET_TYPE_OPTIONS}
          onChange={(value) => setValue("ticket_type", value as EventFormValues["ticket_type"], { shouldValidate: true })}
        />
      </div>

      {ticketType !== "gratis" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="price_at_door">Precio en puerta (ARS)</Label>
            <Input id="price_at_door" type="number" min={0} {...register("price_at_door")} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="price_advance">Precio anticipado (ARS)</Label>
            <Input id="price_advance" type="number" min={0} {...register("price_advance")} />
          </div>
          <FieldError message={errors.price_at_door?.message} />
        </div>
      )}

      <fieldset className="flex flex-col gap-3 rounded-md border border-border p-4">
        <legend className="px-1 text-sm font-medium">Contacto (opcional)</legend>
        <div className="flex flex-col gap-1">
          <Label htmlFor="contact_whatsapp">WhatsApp</Label>
          <Input id="contact_whatsapp" {...register("contact_whatsapp")} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="contact_instagram">Instagram</Label>
          <Input id="contact_instagram" {...register("contact_instagram")} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="contact_web">Web</Label>
          <Input id="contact_web" {...register("contact_web")} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="contact_email">Email</Label>
          <Input id="contact_email" type="email" {...register("contact_email")} />
          <FieldError message={errors.contact_email?.message} />
        </div>
      </fieldset>

      {createEvent.isError && (
        <p className="text-sm text-destructive">
          {createEvent.error instanceof ApiError ? createEvent.error.message : "No pudimos publicar el evento."}
        </p>
      )}

      {createEvent.isSuccess && (
        <p className="text-sm text-primary">
          Evento enviado. Quedó pendiente de aprobación — podés verlo en &quot;Mis eventos&quot;.
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Publicando..." : "Publicar evento"}
      </Button>
    </form>
  );
}
