"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BadgeCheck, Mail, MapPin, MessageCircle, Pencil, Phone, ShieldCheck, User as UserIcon, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCities } from "@/features/auth/hooks/useCities";
import type { User } from "@/features/auth/types";
import { sesaleWhatsappHref } from "@/features/plans/lib/whatsapp";
import { useUpdateProfile } from "@/features/users/hooks/useUpdateProfile";

interface EditableFieldProps {
  icon: React.ElementType;
  label: string;
  value: string;
  placeholder?: string;
  onSave: (value: string) => Promise<unknown>;
}

function EditableTextField({ icon: Icon, label, value, placeholder, onSave }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-3">
        <Icon className="h-3 w-3 text-primary" aria-hidden />
        {label}
      </span>

      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            aria-label={label}
            autoFocus
          />
          <Button type="button" size="sm" disabled={isSaving} onClick={handleSave}>
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft(value);
              setEditing(false);
            }}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-foreground">{value || "—"}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Editar ${label.toLowerCase()}`}
            className="flex items-center gap-1 text-xs font-semibold text-primary"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            editar
          </button>
        </div>
      )}
    </div>
  );
}

function CityField({ currentUser }: { currentUser: User }) {
  const { data: cities } = useCities();
  const updateProfile = useUpdateProfile();
  const [editing, setEditing] = useState(false);

  const currentCityName = cities?.find((c) => c.id === currentUser.city_id)?.name ?? "—";

  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-3">
        <MapPin className="h-3 w-3 text-primary" aria-hidden />
        Ciudad
      </span>

      {editing ? (
        <div className="flex items-center gap-2">
          <Select
            value={currentUser.city_id ?? undefined}
            onValueChange={async (value) => {
              await updateProfile.mutateAsync({ city_id: value });
              setEditing(false);
            }}
          >
            <SelectTrigger aria-label="Ciudad">
              <SelectValue placeholder="Elegí una ciudad" />
            </SelectTrigger>
            <SelectContent>
              {cities?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-foreground">{currentCityName}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Editar ciudad"
            className="flex items-center gap-1 text-xs font-semibold text-primary"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            editar
          </button>
        </div>
      )}
    </div>
  );
}

export function AccountProfile({ currentUser }: { currentUser: User }) {
  const updateProfile = useUpdateProfile();

  const memberSince = format(new Date(currentUser.created_at), "MMMM yyyy", { locale: es });

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
        <UserIcon className="h-4 w-4 text-primary" aria-hidden />
        Mi perfil
      </h2>

      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-3">
          <Mail className="h-3 w-3 text-primary" aria-hidden />
          Email
        </span>
        <span className="text-sm text-foreground">{currentUser.email}</span>
      </div>

      <EditableTextField
        icon={UserIcon}
        label="Nombre público"
        value={currentUser.public_name}
        placeholder="Nombre visible en tus eventos"
        onSave={(value) => updateProfile.mutateAsync({ public_name: value })}
      />

      <CityField currentUser={currentUser} />

      <EditableTextField
        icon={Phone}
        label="WhatsApp público"
        value={currentUser.public_whatsapp ?? ""}
        placeholder="Ej: +54 9 299 1234567"
        onSave={(value) => updateProfile.mutateAsync({ public_whatsapp: value })}
      />

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-3">Verificación</span>
        <div className="flex flex-wrap gap-2">
          <Badge variant={currentUser.email_verified ? "default" : "muted"} className="flex items-center gap-1">
            <Mail className="h-3 w-3" aria-hidden />
            Email {currentUser.email_verified ? "verificado" : "sin verificar"}
          </Badge>
          <Badge variant={currentUser.phone_verified ? "default" : "muted"} className="flex items-center gap-1">
            <Phone className="h-3 w-3" aria-hidden />
            Teléfono {currentUser.phone_verified ? "verificado" : "sin verificar"}
          </Badge>
          {currentUser.is_verified && (
            <Badge variant="pro" className="flex items-center gap-1">
              <BadgeCheck className="h-3 w-3" aria-hidden />
              Identidad verificada ✓
            </Badge>
          )}
        </div>

        {!currentUser.is_verified && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2 p-3">
            <p className="flex items-start gap-1.5 text-sm text-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden />
              ¿Querés que tus eventos muestren el badge de organizador verificado? Contactanos por WhatsApp para
              verificar tu identidad.
            </p>
            <a
              href={sesaleWhatsappHref(
                `Hola, soy ${currentUser.public_name} y quiero verificar mi identidad en seSALE. Mi email registrado es ${currentUser.email}.`,
              )}
              target="_blank"
              rel="noreferrer"
              className="flex w-fit items-center gap-1.5 text-xs font-semibold text-primary"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
              Contactar por WhatsApp →
            </a>
          </div>
        )}
      </div>

      <p className="text-xs text-ink-4">Miembro desde: {memberSince}</p>
    </section>
  );
}

export function AccountProfileSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
