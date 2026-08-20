import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { middleware } from "@/middleware";

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, "http://localhost:3000"));
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
