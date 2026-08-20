import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { middleware } from "@/middleware";

function makeRequest(pathname: string, cookies?: Record<string, string>): NextRequest {
  const request = new NextRequest(new URL(pathname, "http://localhost:3000"));
  for (const [name, value] of Object.entries(cookies ?? {})) {
    request.cookies.set(name, value);
  }
  return request;
}

describe("middleware — modo mantenimiento (Etapa 9d)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("no redirige cuando NEXT_PUBLIC_MAINTENANCE_MODE=false", () => {
    vi.stubEnv("NEXT_PUBLIC_MAINTENANCE_MODE", "false");

    const response = middleware(makeRequest("/"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("no redirige cuando la variable no está seteada", () => {
    vi.stubEnv("NEXT_PUBLIC_MAINTENANCE_MODE", "");

    const response = middleware(makeRequest("/eventos/123"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("redirige a /proximamente cuando NEXT_PUBLIC_MAINTENANCE_MODE=true", () => {
    vi.stubEnv("NEXT_PUBLIC_MAINTENANCE_MODE", "true");

    const response = middleware(makeRequest("/"));

    expect(response.headers.get("x-middleware-rewrite")).toContain("/proximamente");
  });

  it("permite /login en modo mantenimiento", () => {
    vi.stubEnv("NEXT_PUBLIC_MAINTENANCE_MODE", "true");

    const response = middleware(makeRequest("/login"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("permite /proximamente en modo mantenimiento (evita loop de rewrite)", () => {
    vi.stubEnv("NEXT_PUBLIC_MAINTENANCE_MODE", "true");

    const response = middleware(makeRequest("/proximamente"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("permite /_next/* en modo mantenimiento", () => {
    vi.stubEnv("NEXT_PUBLIC_MAINTENANCE_MODE", "true");

    const response = middleware(makeRequest("/_next/static/chunk.js"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("permite /api/* sin filtrar en modo mantenimiento", () => {
    vi.stubEnv("NEXT_PUBLIC_MAINTENANCE_MODE", "true");

    const response = middleware(makeRequest("/api/events"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("redirige rutas de usuario (ej. /mi-cuenta) en modo mantenimiento", () => {
    vi.stubEnv("NEXT_PUBLIC_MAINTENANCE_MODE", "true");

    const response = middleware(makeRequest("/mi-cuenta"));

    expect(response.headers.get("x-middleware-rewrite")).toContain("/proximamente");
  });
});

describe("middleware — protección de rutas autenticadas (Etapa 9e)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const PROTECTED_PATHS = ["/publicar", "/mis-eventos", "/mi-cuenta", "/planes", "/admin"];

  it.each(PROTECTED_PATHS)("redirige %s a /login sin la cookie has_session", (pathname) => {
    const response = middleware(makeRequest(pathname));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("redirect")).toBe(pathname);
  });

  it.each(PROTECTED_PATHS)("deja pasar %s con la cookie has_session", (pathname) => {
    const response = middleware(makeRequest(pathname, { has_session: "1" }));

    expect(response.headers.get("location")).toBeNull();
  });

  it("redirige /eventos/{id}/editar sin sesión", () => {
    const response = middleware(makeRequest("/eventos/abc-123/editar"));

    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("redirect")).toBe("/eventos/abc-123/editar");
  });

  it("no redirige /eventos/{id} (detalle público) sin sesión", () => {
    const response = middleware(makeRequest("/eventos/abc-123"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("preserva la query string original en el redirect", () => {
    const response = middleware(makeRequest("/planes?event_id=123"));

    const location = new URL(response.headers.get("location")!);
    expect(location.searchParams.get("redirect")).toBe("/planes?event_id=123");
  });

  it("no redirige / (home) sin sesión", () => {
    const response = middleware(makeRequest("/"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("no redirige /login sin sesión (evita loop infinito)", () => {
    const response = middleware(makeRequest("/login"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("no redirige /registro sin sesión", () => {
    const response = middleware(makeRequest("/registro"));

    expect(response.headers.get("location")).toBeNull();
  });
});
