/** @type {import('next').NextConfig} */
const nextConfig = {
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
