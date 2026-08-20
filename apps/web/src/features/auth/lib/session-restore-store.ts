// Etapa 9e — necesario para que admin/layout.tsx (y cualquier guard de ruta
// futuro) no redirija a un usuario real antes de que AuthProvider termine de
// intentar restaurar la sesión (POST /api/auth/refresh contra la cookie
// refresh_token httpOnly). Sin esto, en un refresh de página el access_token
// todavía no está en memoria (token-store.ts), useCurrentUser queda
// "enabled: false" y por lo tanto nunca "isLoading" — un admin real sería
// expulsado a "/" por una fracción de segundo de carrera, no por falta de
// sesión real. Mismo patrón singleton que token-store.ts (no es un
// componente, api-client.ts/AuthProvider.tsx lo necesitan fuera de React).
let restoring = true;

type Listener = () => void;
const listeners = new Set<Listener>();

export function isRestoringSession(): boolean {
  return restoring;
}

export function setRestoringSession(value: boolean): void {
  restoring = value;
  listeners.forEach((listener) => listener());
}

export function subscribeRestoringSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
