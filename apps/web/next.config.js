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
    // Reenvía /api/* al backend local. Esto permite tunelear un solo puerto
    // (el del frontend) con ngrok y que MercadoPago pueda llegar tanto a las
    // páginas de retorno (back_urls) como al webhook (notification_url) bajo
    // el mismo dominio público.
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
