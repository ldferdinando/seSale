"use client";

import { UserCog } from "lucide-react";

import { UserPicker } from "@/features/users/components/UserPicker";

interface OrganizerPickerProps {
  value: string | undefined;
  onChange: (organizerId: string | undefined) => void;
}

/**
 * Selector opcional, solo visible para admins: permite cargar el evento en
 * nombre de otro organizador (Etapa 5.6). Vacío = el organizador es el admin.
 * Usa el mismo UserPicker que el modal de banners (buscador + lista + tarjeta
 * del elegido, sin autocompletado del navegador).
 */
export function OrganizerPicker({ value, onChange }: OrganizerPickerProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="event-organizer" className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-3">
        <UserCog className="h-3 w-3 text-primary" aria-hidden />
        Cargar en nombre de (opcional)
      </label>
      <UserPicker
        id="event-organizer"
        value={value ?? null}
        onChange={(user) => onChange(user?.id)}
        searchLabel="Buscar organizador"
        emptySelectionHint="Si no elegís a nadie, el evento queda a tu nombre (admin)."
      />
    </div>
  );
}
