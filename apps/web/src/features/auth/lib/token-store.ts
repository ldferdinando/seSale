// Singleton a nivel módulo: el access_token vive solo en memoria (no
// localStorage), y api-client.ts necesita leerlo sincrónicamente en cada
// request sin depender de React (no es un componente).
let accessToken: string | null = null;

export function getToken(): string | null {
  return accessToken;
}

export function setToken(token: string | null): void {
  accessToken = token;
}

export function clearToken(): void {
  accessToken = null;
}
