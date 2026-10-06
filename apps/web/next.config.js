// Etapa 9c — headers de seguridad HTTP base. Sin Content-Security-Policy
// todavía a propósito (ver a_revisar.md): es más delicado de configurar bien
// con Leaflet/Supabase y puede romper la app — queda para después del primer
// deploy, cuando se pueda probar en el navegador contra producción real.
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
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
