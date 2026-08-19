"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UserAdmin } from "@/features/users/types";

/**
 * Etapa 9b — detalle completo de un usuario para el panel admin, incluidos
 * los campos privados (doc_type/doc_number/phone) — construido a mano con
 * `role="dialog"`, mismo patrón sin @radix-ui/react-dialog que
 * ConfirmDialog.tsx (no está instalado en el proyecto).
 */
export function UserDetailModal({
  user,
  onClose,
  onViewEvents,
}: {
  user: UserAdmin;
  onClose: () => void;
  onViewEvents: (organizerId: string) => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle de ${user.public_name}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-sm flex-col gap-3 rounded-t-2xl bg-card p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-foreground">{user.public_name}</h2>
            <p className="text-xs text-ink-4">{user.email}</p>
          </div>
          <Badge variant={user.role === "admin" ? "pro" : "muted"}>
            {user.role === "admin" ? "Admin" : "Usuario"}
          </Badge>
        </div>

        <dl className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-ink-4">Nombre real</dt>
            <dd className="text-right text-foreground">{user.full_name}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-4">Ciudad</dt>
            <dd className="text-right text-foreground">{user.city_name ?? "Sin asignar"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-4">Documento</dt>
            <dd className="text-right text-foreground">
              {user.doc_type && user.doc_number ? `${user.doc_type.toUpperCase()} ${user.doc_number}` : "No cargado"}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-4">Teléfono</dt>
            <dd className="text-right text-foreground">{user.phone ?? "No cargado"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-4">Estado</dt>
            <dd className="text-right text-foreground">{user.is_active ? "Activo" : "Desactivado"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-4">Verificado</dt>
            <dd className="text-right text-foreground">{user.is_verified ? "Sí" : "No"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-4">Registrado</dt>
            <dd className="text-right text-foreground">
              {format(new Date(user.created_at), "d 'de' MMMM 'de' yyyy", { locale: es })}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-4">Eventos creados</dt>
            <dd className="text-right text-foreground">{user.event_count}</dd>
          </div>
        </dl>

        <div className="flex gap-2 pt-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => onViewEvents(user.id)}>
            Ver eventos
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onClose} className="ml-auto">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
