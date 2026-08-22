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

/** @type {import('next').NextConfig} */
const nextConfig = {
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
