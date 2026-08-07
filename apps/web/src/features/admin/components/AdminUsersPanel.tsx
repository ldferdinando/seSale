"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCities } from "@/features/auth/hooks/useCities";
import { useCreateUser } from "@/features/users/hooks/useCreateUser";
import type { AdminUserCreateInput } from "@/features/users/types";
import { ApiError } from "@/lib/api-client";

const EMPTY_FORM: AdminUserCreateInput = {
  email: "",
  password: "",
  public_name: "",
  full_name: "",
  city_id: undefined,
  role: "user",
};

function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const { data: cities } = useCities();
  const createUser = useCreateUser();
  const [form, setForm] = useState<AdminUserCreateInput>(EMPTY_FORM);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createUser.mutateAsync(form);
    } catch {
      return;
    }
    setForm(EMPTY_FORM);
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="admin-user-email">Email</Label>
        <Input
          id="admin-user-email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="admin-user-password">Contraseña</Label>
        <Input
          id="admin-user-password"
          type="password"
          required
          minLength={8}
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="admin-user-public-name">Nombre público</Label>
        <Input
          id="admin-user-public-name"
          required
          value={form.public_name}
          onChange={(e) => setForm((f) => ({ ...f, public_name: e.target.value }))}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="admin-user-full-name">Nombre completo</Label>
        <Input
          id="admin-user-full-name"
          required
          value={form.full_name}
          onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label>Ciudad</Label>
        <Select
          value={form.city_id}
          onValueChange={(value) => setForm((f) => ({ ...f, city_id: value }))}
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
      </div>

      <div className="flex flex-col gap-1">
        <Label>Rol</Label>
        <Select value={form.role} onValueChange={(value) => setForm((f) => ({ ...f, role: value as "user" | "admin" }))}>
          <SelectTrigger aria-label="Rol">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">Usuario</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {createUser.isError && (
        <p role="alert" className="text-sm text-destructive">
          {createUser.error instanceof ApiError ? createUser.error.message : "No pudimos crear el usuario."}
        </p>
      )}

      <Button type="submit" disabled={createUser.isPending} className="mt-2">
        {createUser.isPending ? "Creando..." : "Crear usuario"}
      </Button>
    </form>
  );
}

export function AdminUsersPanel() {
  const [showForm, setShowForm] = useState(false);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-bold text-foreground">Usuarios</h2>
        <Button
          type="button"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5"
        >
          <UserPlus className="h-3.5 w-3.5" aria-hidden />
          {showForm ? "Cancelar" : "Crear usuario"}
        </Button>
      </div>

      {showForm && <CreateUserForm onCreated={() => setShowForm(false)} />}
    </section>
  );
}
