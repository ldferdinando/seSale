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
  "/privacidad", // Google exige que la Política de Privacidad y los
  "/terminos", //   Términos sean públicos aun con el sitio en mantenimiento
  "/api", // el backend pasa sin filtro
  "/_next", // assets de Next.js
  "/favicon",
  "/icons",
  "/images",
];

// Etapa 9e — protección de rutas autenticadas. El access_token vive solo en
// memoria del cliente (nunca en cookie) y refresh_token es HttpOnly con
// path=/api/auth (no viaja a estas rutas) — ninguno de los dos es legible
// acá. Se usa "has_session" (apps/api/app/routers/auth.py): cookie liviana
// no-HttpOnly, path=/, que el backend setea/borra junto con refresh_token
// exactamente para este caso. Su presencia no prueba que el JWT sea válido
// — el backend sigue siendo la única autoridad real (401 si no lo es) —
// pero evita que alguien sin sesión llegue a completar un formulario entero
// para recién enterarse al final que necesita login.
const HAS_SESSION_COOKIE_NAME = "has_session";

// Prefijos de rutas que requieren sesión.
const AUTH_REQUIRED_PATHS = ["/publicar", "/mis-eventos", "/mi-cuenta", "/planes", "/admin"];

// /eventos/[id] es pública (detalle de evento) pero /eventos/[id]/editar no
// — no puede resolverse con un prefijo simple como las de arriba.
const EDITAR_EVENTO_PATTERN = /^\/eventos\/[^/]+\/editar$/;

function requiresAuth(pathname: string): boolean {
  return AUTH_REQUIRED_PATHS.some((p) => pathname.startsWith(p)) || EDITAR_EVENTO_PATTERN.test(pathname);
}

// Auditoría post-lanzamiento — mitigación de X-Forwarded-For spoofing: quien
// le pega directo al dominio de Railway (en vez de pasar por esta rewrite de
// Vercel) puede mandar un X-Forwarded-For falso y saltear el rate limit por
// IP del backend (ver apps/api/app/core/deps.py, get_client_ip). Si
// PROXY_SHARED_SECRET está seteado en el entorno del frontend, se agrega acá
// — antes de que next.config.js reenvíe /api/:path* al backend — un header
// que solo este middleware puede poner. El backend solo confía en
// X-Forwarded-For cuando ese header coincide, así que una request directa a
// Railway (sin pasar por este middleware) nunca puede traerlo.
//
// Variable de servidor (no NEXT_PUBLIC_): el middleware corre en el Edge
// Runtime de Next, que sí tiene acceso a process.env de variables no
// públicas en runtime (a diferencia del bundle de cliente) — si se usara
// NEXT_PUBLIC_, el valor quedaría expuesto en el JS del browser y cualquiera
// podría leerlo y falsificar el header.
const PROXY_SECRET_HEADER = "x-sesale-proxy-secret";

function withProxySecretHeader(request: NextRequest): NextResponse {
  const secret = process.env.PROXY_SHARED_SECRET;
  if (!secret) {
    return NextResponse.next();
  }
  const headers = new Headers(request.headers);
  headers.set(PROXY_SECRET_HEADER, secret);
  return NextResponse.next({ request: { headers } });
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  if (isMaintenanceMode && !ALWAYS_ALLOWED.some((p) => pathname.startsWith(p))) {
    return NextResponse.rewrite(new URL("/proximamente", request.url));
  }

  if (pathname.startsWith("/api")) {
    return withProxySecretHeader(request);
  }

  if (requiresAuth(pathname) && !request.cookies.get(HAS_SESSION_COOKIE_NAME)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
