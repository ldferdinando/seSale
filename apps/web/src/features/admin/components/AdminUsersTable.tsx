"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { UserDetailModal } from "@/features/admin/components/UserDetailModal";
import { useAdminUsers } from "@/features/users/hooks/useAdminUsers";
import { useUpdateUserActive } from "@/features/users/hooks/useUpdateUserActive";
import { useUpdateUserRole } from "@/features/users/hooks/useUpdateUserRole";
import { useVerifyUser } from "@/features/users/hooks/useVerifyUser";
import type { UserAdmin, UserAdminFilters } from "@/features/users/types";

function UserRow({
  user,
  onViewDetail,
  onViewEvents,
}: {
  user: UserAdmin;
  onViewDetail: (user: UserAdmin) => void;
  onViewEvents: (organizerId: string) => void;
}) {
  const updateRole = useUpdateUserRole();
  const updateActive = useUpdateUserActive();
  const updateVerified = useVerifyUser();

  return (
    <div data-testid="admin-user-row" className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-foreground">{user.public_name}</p>
          <p className="text-xs text-ink-4">{user.email}</p>
          <p className="text-xs text-ink-5">{user.city_name ?? "Sin ciudad"}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          <Badge variant={user.role === "admin" ? "pro" : "muted"}>{user.role === "admin" ? "Admin" : "Usuario"}</Badge>
          {user.is_verified && <Badge>Verificado</Badge>}
          {!user.is_active && (
            <Badge variant="muted" className="bg-destructive/15 text-destructive">
              Desactivado
            </Badge>
          )}
        </div>
      </div>

      <p className="text-xs text-ink-4">
        Registrado el {format(new Date(user.created_at), "d 'de' MMMM 'de' yyyy", { locale: es })} ·{" "}
        {user.event_count} evento{user.event_count === 1 ? "" : "s"}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => onViewDetail(user)}>
          Ver detalle
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onViewEvents(user.id)}>
          Ver eventos
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={updateRole.isPending}
          onClick={() => updateRole.mutate({ userId: user.id, role: user.role === "admin" ? "user" : "admin" })}
        >
          {user.role === "admin" ? "Quitar admin" : "Hacer admin"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={updateActive.isPending}
          onClick={() => updateActive.mutate({ userId: user.id, isActive: !user.is_active })}
        >
          {user.is_active ? "Desactivar" : "Activar"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={updateVerified.isPending}
          title="Verificar cuando hayas confirmado la identidad del organizador por fuera del sistema (DNI/CUIT por WhatsApp)."
          onClick={() => updateVerified.mutate({ userId: user.id, isVerified: !user.is_verified })}
        >
          {user.is_verified ? "Quitar verificación" : "Verificar"}
        </Button>
      </div>
    </div>
  );
}

export function AdminUsersTable({ onViewUserEvents }: { onViewUserEvents: (organizerId: string) => void }) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string>("__all__");
  const [activeFilter, setActiveFilter] = useState<string>("__all__");
  const [detailUser, setDetailUser] = useState<UserAdmin | null>(null);

  const filters: UserAdminFilters = {
    search: search || undefined,
    role: role === "__all__" ? undefined : (role as "user" | "admin"),
    is_active: activeFilter === "__all__" ? undefined : activeFilter === "true",
  };

  const { data: users, isLoading, isError } = useAdminUsers(filters);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por email o nombre..."
          aria-label="Buscar usuario"
          className="w-[220px]"
        />

        <Select value={role} onValueChange={setRole}>
          <SelectTrigger aria-label="Filtrar por rol" className="w-[160px]">
            <SelectValue placeholder="Todos los roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            <SelectItem value="user">Usuarios</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>

        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger aria-label="Filtrar por estado" className="w-[160px]">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            <SelectItem value="true">Activos</SelectItem>
            <SelectItem value="false">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div data-testid="admin-users-loading" className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {isError && (
        <p role="alert" className="text-sm text-muted-foreground">
          No pudimos cargar los usuarios. Intentá de nuevo más tarde.
        </p>
      )}

      {users && users.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay usuarios que coincidan con los filtros.</p>
      )}

      {users && users.length > 0 && (
        <div className="flex flex-col gap-3">
          {users.map((user) => (
            <UserRow key={user.id} user={user} onViewDetail={setDetailUser} onViewEvents={onViewUserEvents} />
          ))}
        </div>
      )}

      {detailUser && (
        <UserDetailModal user={detailUser} onClose={() => setDetailUser(null)} onViewEvents={onViewUserEvents} />
      )}
    </div>
  );
}
