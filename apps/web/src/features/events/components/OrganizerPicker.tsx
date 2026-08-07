"use client";

import { UserCog } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUsersList } from "@/features/users/hooks/useUsersList";

interface OrganizerPickerProps {
  value: string | undefined;
  onChange: (organizerId: string | undefined) => void;
}

/**
 * Selector opcional, solo visible para admins: permite cargar el evento en
 * nombre de otro organizador (Etapa 5.6). Vacío = el organizador es el admin.
 */
export function OrganizerPicker({ value, onChange }: OrganizerPickerProps) {
  const [search, setSearch] = useState("");
  const { data: users, isLoading } = useUsersList(search);

  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-3">
        <UserCog className="h-3 w-3 text-primary" aria-hidden />
        Cargar en nombre de (opcional)
      </span>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o email..."
        aria-label="Buscar organizador"
      />
      <Select
        value={value ?? "__self__"}
        onValueChange={(selected) => onChange(selected === "__self__" ? undefined : selected)}
      >
        <SelectTrigger aria-label="Organizador">
          <SelectValue placeholder={isLoading ? "Cargando..." : "Vos (admin)"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__self__">Vos (admin)</SelectItem>
          {users?.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.public_name} — {user.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
