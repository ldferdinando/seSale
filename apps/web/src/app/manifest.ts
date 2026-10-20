import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "seSALE — Agenda cultural del Alto Valle",
    short_name: "seSALE",
    description: "Descubrí los eventos culturales del Alto Valle de la Patagonia",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#F2357B",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
