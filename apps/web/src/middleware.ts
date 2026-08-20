import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Etapa 9d — modo mantenimiento. La app se va a deployar antes de estar
// lista para el público: mientras NEXT_PUBLIC_MAINTENANCE_MODE=true, todo
// el sitio salvo estas rutas se rewritea a /proximamente. El admin (y quien
// tenga el link directo) puede seguir entrando por /login normalmente.

// Rutas que siempre están accesibles aunque el modo mantenimiento esté activo.
const ALWAYS_ALLOWED = [
  "/proximamente", // la página de mantenimiento
  "/login", // para que el admin pueda entrar
  "/api", // el backend pasa sin filtro
  "/_next", // assets de Next.js
  "/favicon",
  "/icons",
  "/images",
];

export function middleware(request: NextRequest) {
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  if (!isMaintenanceMode) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;

  if (ALWAYS_ALLOWED.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(new URL("/proximamente", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
