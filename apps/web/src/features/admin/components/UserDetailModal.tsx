"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCities } from "@/features/auth/hooks/useCities";
import { useUpdateUserAdmin } from "@/features/users/hooks/useUpdateUserAdmin";
import type { AdminUserEditInput, UserAdmin } from "@/features/users/types";
import { ApiError } from "@/lib/api-client";

function editFormFromUser(user: UserAdmin): AdminUserEditInput {
  return {
    full_name: user.full_name,
    public_name: user.public_name,
    city_id: user.city_id ?? undefined,
    doc_type: (user.doc_type as "dni" | "cuit" | null) ?? undefined,
    doc_number: user.doc_number ?? "",
    phone: user.phone ?? "",
    public_whatsapp: user.public_whatsapp ?? "",
  };
}

/**
 * Etapa 9b — detalle completo de un usuario para el panel admin, incluidos
 * los campos privados (doc_type/doc_number/phone) — construido a mano con
 * `role="dialog"`, mismo patrón sin @radix-ui/react-dialog que
 * ConfirmDialog.tsx (no está instalado en el proyecto).
 *
 * Etapa 11a — BUG 4: antes era 100% de solo lectura (un `<dl>` con texto
 * plano) — el admin no tenía forma de corregir el nombre, documento,
 * teléfono o ciudad de un usuario ya cargado. Ahora tiene un botón
 * "Editar" que cambia el `<dl>` por un formulario, guardado explícito con
 * PATCH /api/users/{id} (mismo endpoint que ya usan los toggles de
 * rol/activo/verificado de AdminUsersTable.tsx). `email` no es editable
 * (es el identificador) — tampoco `role`/`is_active`/`is_verified`, que ya
 * tienen sus propios controles fuera de este modal.
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
  const { data: cities } = useCities();
  const updateUser = useUpdateUserAdmin();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<AdminUserEditInput>(() => editFormFromUser(user));

  function startEditing() {
    setForm(editFormFromUser(user));
    setEditing(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateUser.mutateAsync({ userId: user.id, input: form });
    } catch {
      return;
    }
    // El modal recibe `user` como una foto fija del momento en que se abrió
    // — AdminUsersTable no la actualiza tras la mutación (solo invalida la
    // query de la lista de atrás). Se cierra en vez de volver a la vista
    // de solo lectura para no mostrar datos viejos hasta que se reabra.
    onClose();
  }

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

        {editing ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="edit-user-full-name">Nombre real</Label>
              <Input
                id="edit-user-full-name"
                required
                value={form.full_name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="edit-user-public-name">Nombre público</Label>
              <Input
                id="edit-user-public-name"
                required
                value={form.public_name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, public_name: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label>Ciudad</Label>
              <Select
                value={form.city_id ?? undefined}
                onValueChange={(value) => setForm((f) => ({ ...f, city_id: value }))}
              >
                <SelectTrigger aria-label="Ciudad">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  {cities?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-1">
                <Label>Tipo de documento</Label>
                <Select
                  value={form.doc_type ?? undefined}
                  onValueChange={(value) => setForm((f) => ({ ...f, doc_type: value as "dni" | "cuit" }))}
                >
                  <SelectTrigger aria-label="Tipo de documento">
                    <SelectValue placeholder="Sin cargar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dni">DNI</SelectItem>
                    <SelectItem value="cuit">CUIT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <Label htmlFor="edit-user-doc-number">Número</Label>
                <Input
                  id="edit-user-doc-number"
                  value={form.doc_number ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, doc_number: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="edit-user-phone">Teléfono</Label>
              <Input
                id="edit-user-phone"
                value={form.phone ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="edit-user-whatsapp">WhatsApp público</Label>
              <Input
                id="edit-user-whatsapp"
                value={form.public_whatsapp ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, public_whatsapp: e.target.value }))}
              />
            </div>

            {updateUser.isError && (
              <p role="alert" className="text-sm text-destructive">
                {updateUser.error instanceof ApiError ? updateUser.error.message : "No pudimos guardar los cambios."}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" disabled={updateUser.isPending}>
                {updateUser.isPending ? "Guardando..." : "Guardar"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <>
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
                <dt className="text-ink-4">WhatsApp público</dt>
                <dd className="text-right text-foreground">{user.public_whatsapp ?? "No cargado"}</dd>
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
              <Button type="button" size="sm" onClick={startEditing}>
                Editar
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => onViewEvents(user.id)}>
                Ver eventos
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={onClose} className="ml-auto">
                Cerrar
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
