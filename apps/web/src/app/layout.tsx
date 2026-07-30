import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/lib/query-client";

export const metadata: Metadata = {
  title: "seSALE — Agenda cultural del Alto Valle",
  description: "Descubrí los eventos culturales del Alto Valle de la Patagonia",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
