"use client";

import { Search, UserCheck } from "lucide-react";
import { forwardRef, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { filterUsers, useUsersList } from "@/features/users/hooks/useUsersList";
import type { User } from "@/features/auth/types";
import { cn } from "@/lib/utils";

const MAX_RESULTS = 8;

interface UserPickerProps {
  /** id del input de búsqueda (para el `htmlFor` del label externo). */
  id: string;
  /** Usuario elegido (id) o null si todavía no se eligió ninguno. */
  value: string | null;
  onChange: (user: User | null) => void;
  /** Texto accesible del buscador, ej: "Buscar anunciante". */
  searchLabel: string;
  invalid?: boolean;
  /** id del mensaje de error, para `aria-describedby`. */
  errorId?: string;
  /** Texto que se muestra cuando no hay nadie elegido (ej: "Vos (admin)"). */
  emptySelectionHint?: string;
}

/**
 * Selector de usuario para formularios del admin: buscador + lista de
 * resultados, y al elegir, una tarjeta con nombre + email y "Cambiar".
 * El buscador y la selección son elementos distintos a propósito: antes el
 * texto tipeado (o autocompletado por el navegador) en el buscador se
 * confundía con un valor elegido.
 */
export const UserPicker = forwardRef<HTMLInputElement, UserPickerProps>(function UserPicker(
  { id, value, onChange, searchLabel, invalid = false, errorId, emptySelectionHint },
  ref,
) {
  const [search, setSearch] = useState("");
  const { data: users, isLoading, isError } = useUsersList();

  const selected = value ? users?.find((u) => u.id === value) : undefined;
  const results = useMemo(() => filterUsers(users ?? [], search).slice(0, MAX_RESULTS), [users, search]);
  const listId = `${id}-results`;

  if (value) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3"
        aria-label="Usuario seleccionado"
        role="group"
      >
        <UserCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {selected?.public_name ?? (isLoading ? "Cargando..." : "Usuario seleccionado")}
          </p>
          {selected && <p className="truncate text-xs text-ink-4">{selected.email}</p>}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          Cambiar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {emptySelectionHint && <p className="text-xs text-ink-4">{emptySelectionHint}</p>}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-5" aria-hidden />
        <Input
          ref={ref}
          id={id}
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email..."
          aria-label={searchLabel}
          aria-controls={listId}
          aria-invalid={invalid || undefined}
          aria-describedby={errorId}
          // Sin autocompletado: Chrome rellenaba el buscador con el nombre de
          // la admin y parecía que ya había un usuario elegido.
          autoComplete="off"
          name={`${id}-search`}
          className="pl-9"
        />
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label="Resultados"
        className={cn(
          "max-h-48 overflow-y-auto rounded-md border bg-card",
          invalid ? "border-destructive" : "border-border",
        )}
      >
        {isLoading ? (
          <li className="px-3 py-2 text-sm text-ink-5">Cargando usuarios...</li>
        ) : isError ? (
          <li className="px-3 py-2 text-sm text-destructive">No pudimos cargar los usuarios.</li>
        ) : results.length === 0 ? (
          <li className="px-3 py-2 text-sm text-ink-5">No se encontraron usuarios.</li>
        ) : (
          results.map((u) => (
            <li key={u.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  setSearch("");
                  onChange(u);
                }}
                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <span className="text-sm font-medium text-foreground">{u.public_name}</span>
                <span className="text-xs text-ink-4">{u.email}</span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
});
