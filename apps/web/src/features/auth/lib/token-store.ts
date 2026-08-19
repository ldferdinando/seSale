// Singleton a nivel módulo: el access_token vive solo en memoria (no
// localStorage), y api-client.ts necesita leerlo sincrónicamente en cada
// request sin depender de React (no es un componente).
let accessToken: string | null = null;

type Listener = () => void;
const listeners = new Set<Listener>();

export function getToken(): string | null {
  return accessToken;
}

export function setToken(token: string | null): void {
  accessToken = token;
  listeners.forEach((listener) => listener());
}

export function clearToken(): void {
  setToken(null);
}

// Permite a useCurrentUser (useSyncExternalStore) re-evaluar cuándo hay
// token disponible, sin necesidad de que token-store sea un componente.
export function subscribeToken(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
