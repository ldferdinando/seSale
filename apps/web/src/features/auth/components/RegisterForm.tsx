"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, IdCard, Lock, Mail, MapPin, Phone, User as UserIcon, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCities } from "@/features/auth/hooks/useCities";
import { useRegister } from "@/features/auth/hooks/useRegister";
import { registerFormSchema, type RegisterFormValues } from "@/features/auth/schemas/auth-schema";
import { ApiError } from "@/lib/api-client";

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

export function RegisterForm() {
  const router = useRouter();
  const registerMutation = useRegister();
  const { data: cities } = useCities();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: "",
      password: "",
      full_name: "",
      doc_type: "",
      doc_number: "",
      phone: "",
      public_name: "",
      public_whatsapp: "",
      city_id: "",
    },
  });

  const cityId = watch("city_id");

  async function onSubmit(values: RegisterFormValues) {
    try {
      await registerMutation.mutateAsync({
        email: values.email,
        password: values.password,
        full_name: values.full_name,
        doc_type: values.doc_type || undefined,
        doc_number: values.doc_number || undefined,
        phone: values.phone || undefined,
        public_name: values.public_name,
        public_whatsapp: values.public_whatsapp || undefined,
        city_id: values.city_id || undefined,
      });
    } catch {
      return;
    }
    router.push("/login");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1">
        <FieldLabel icon={Mail} htmlFor="email" required>
          Email
        </FieldLabel>
        <Input id="email" type="email" {...register("email")} placeholder="tu@email.com" />
        <FieldError message={errors.email?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <FieldLabel icon={Lock} htmlFor="password" required>
          Contraseña
        </FieldLabel>
        <Input id="password" type="password" {...register("password")} placeholder="Mínimo 8 caracteres" />
        <FieldError message={errors.password?.message} />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-bold text-ink-2">Datos privados</p>
        <p className="text-xs text-ink-4">Solo los ve el equipo de seSALE, nunca se publican.</p>

        <div className="flex flex-col gap-1">
          <FieldLabel icon={UserIcon} htmlFor="full_name" required>
            Nombre real
          </FieldLabel>
          <Input id="full_name" {...register("full_name")} placeholder="Ej: Juan Pérez" />
          <FieldError message={errors.full_name?.message} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <FieldLabel icon={IdCard} htmlFor="doc_type">
              Tipo de doc.
            </FieldLabel>
            <select
              id="doc_type"
              {...register("doc_type")}
              className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
            >
              <option value="">Sin especificar</option>
              <option value="dni">DNI</option>
              <option value="cuit">CUIT</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <FieldLabel icon={IdCard} htmlFor="doc_number">
              Número
            </FieldLabel>
            <Input id="doc_number" {...register("doc_number")} placeholder="Ej: 30123456" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <FieldLabel icon={Phone} htmlFor="phone">
            Teléfono
          </FieldLabel>
          <Input id="phone" {...register("phone")} placeholder="Ej: +54 9 299 1234567" />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-bold text-ink-2">Datos públicos</p>
        <p className="text-xs text-ink-4">Se muestran en los eventos que publiques.</p>

        <div className="flex flex-col gap-1">
          <FieldLabel icon={UserIcon} htmlFor="public_name" required>
            Nombre público
          </FieldLabel>
          <Input id="public_name" {...register("public_name")} placeholder="Ej: El Tinglado Bar" />
          <FieldError message={errors.public_name?.message} />
        </div>

        <div className="flex flex-col gap-1">
          <FieldLabel icon={Phone} htmlFor="public_whatsapp">
            WhatsApp de contacto
          </FieldLabel>
          <Input id="public_whatsapp" {...register("public_whatsapp")} placeholder="Ej: +54 9 299 1234567" />
        </div>

        <div className="flex flex-col gap-1">
          <FieldLabel icon={MapPin}>Ciudad</FieldLabel>
          <Select value={cityId} onValueChange={(value) => setValue("city_id", value, { shouldValidate: true })}>
            <SelectTrigger id="city_id" aria-label="Ciudad">
              <SelectValue placeholder="Elegí tu ciudad" />
            </SelectTrigger>
            <SelectContent>
              {(cities ?? []).map((city) => (
                <SelectItem key={city.id} value={city.id}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.city_id?.message} />
        </div>
      </div>

      {registerMutation.isError && (
        <p className="text-sm text-destructive">
          {registerMutation.error instanceof ApiError ? registerMutation.error.message : "No pudimos crear tu cuenta."}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-xl text-base">
        {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </form>
  );
}
