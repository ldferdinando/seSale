// Auditoría post-lanzamiento — CSP en modo Report-Only (ver a_revisar.md):
// se arranca en modo "solo reportar" (no bloquea nada) para poder validar
// contra producción real (Leaflet/OSM, Supabase Storage, Google Sign-In,
// MercadoPago por redirect) antes de pasar a modo bloqueante. Dominios
// permitidos, uno por uno:
//  - 'self': assets propios de Next.js, API same-origin vía rewrite /api/*
//  - accounts.google.com: script del botón + iframe de Google Identity
//    Services (GoogleLoginButton.tsx) — script-src, connect-src, frame-src
//  - *.tile.openstreetmap.org: tiles del mapa (EventsMap.tsx, MapPicker.tsx)
//  - *.supabase.co: imágenes públicas de flyers/banners/covers (img-src) —
//    MercadoPago no necesita entrada propia: el checkout es una navegación
//    de página completa (`window.location.href`, checkout-window.ts), no
//    un script ni un form POST, así que no lo bloquea ninguna directiva de
//    esta lista.
// blob:/data: en img-src son el preview local del archivo elegido antes de
// subir (MediaUpload.tsx, URL.createObjectURL) y favicons/inline svg.
// style-src necesita accounts.google.com además de 'self': el botón de
// Google Identity Services inyecta su propia hoja de estilos
// (https://accounts.google.com/gsi/style) — confirmado con el navegador
// contra /mi-cuenta y /publicar en modo Report-Only antes de este commit.
//
// 'unsafe-eval' en script-src solo en development: lo exige el runtime de
// Fast Refresh de Next (`eval()` para el HMR del webpack dev server) — el
// build de producción (`next build && next start`) no lo usa. No se agregó
// nunca a la política real que corre en Vercel.
const isProdBuild = process.env.NODE_ENV === "production";
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProdBuild ? "" : " 'unsafe-eval'"} https://accounts.google.com`,
  "style-src 'self' 'unsafe-inline' https://accounts.google.com",
  "img-src 'self' data: blob: https://*.supabase.co https://*.tile.openstreetmap.org",
  "font-src 'self' data:",
  "connect-src 'self' https://accounts.google.com",
  "frame-src https://accounts.google.com",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Content-Security-Policy-Report-Only", value: cspDirectives },
];

// P0-4 (PERFORMANCE_AUDIT.md) — orígenes de media que puede optimizar
// next/image. Tiene que coincidir con isOptimizableMediaUrl() de
// src/lib/media.ts: lo que no matchea (banners con URL externa, GIFs) se
// renderiza con `unoptimized`.
const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");
const isLocalApi = ["localhost", "127.0.0.1", "[::1]"].includes(apiUrl.hostname);

function mediaRemotePatterns() {
  const patterns = [
    // Supabase Storage — buckets públicos de flyers, banners y covers.
    { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
  ];
  // Fallback local del backend (development sin Supabase): /uploads/...
  patterns.push({
    protocol: apiUrl.protocol.replace(":", ""),
    hostname: apiUrl.hostname,
    port: apiUrl.port,
    pathname: "/uploads/**",
  });
  return patterns;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: mediaRemotePatterns(),
    // Next 16 bloquea por defecto optimizar imágenes que resuelven a una IP
    // privada (SSRF). Solo se habilita si el backend es local (dev, o
    // `next start` local contra localhost:8000), porque ahí vive el
    // fallback de /uploads. En producción NEXT_PUBLIC_API_URL es Railway y
    // las imágenes vienen de Supabase (IP pública): queda en false.
    dangerouslyAllowLocalIP: isLocalApi,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    // Reenvía /api/* al backend. En dev local esto permite tunelear un solo
    // puerto (el del frontend) con ngrok y que MercadoPago llegue tanto a las
    // páginas de retorno (back_urls) como al webhook (notification_url) bajo
    // el mismo dominio público.
    //
    // En producción (frontend en Vercel, backend en Railway — dominios
    // distintos) esta rewrite es además lo que hace posible el login: el
    // browser nunca le pega directo al backend, así que desde su perspectiva
    // el backend es "same-origin" con el frontend. Sin esto, las cookies de
    // sesión (has_session, refresh_token) quedarían seteadas para el dominio
    // de Railway y nunca llegarían al middleware de Next.js (que corre en el
    // dominio de Vercel) ni se reenviarían en llamados posteriores bajo
    // SameSite=Strict — ver api-client.ts.
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
