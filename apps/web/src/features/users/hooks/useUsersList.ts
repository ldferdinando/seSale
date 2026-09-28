import { useQuery } from "@tanstack/react-query";

import type { User } from "@/features/auth/types";
import { fetchUsers } from "@/features/users/services/users-api";

/** Lista completa de usuarios para los selectores del admin (anunciante de
 * banner, organizador de evento). GET /api/users no filtra en el backend, así
 * que se pide UNA sola vez (queryKey fija) y la búsqueda se hace en memoria
 * con `filterUsers` — antes la queryKey incluía el texto del buscador y cada
 * tecla (o cada autofill del navegador) disparaba un GET /api/users nuevo. */
export function useUsersList() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => fetchUsers(),
    staleTime: 60_000,
  });
}

export function filterUsers(users: User[], search: string): User[] {
  const query = search.trim().toLowerCase();
  if (!query) return users;
  return users.filter(
    (user) => user.public_name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query),
  );
}
