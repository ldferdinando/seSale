import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { QueryProvider } from "@/lib/query-client";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "seSALE — Agenda cultural del Alto Valle",
  description: "Descubrí los eventos culturales del Alto Valle de la Patagonia",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="flex min-h-screen flex-col">
        <QueryProvider>
          <Navbar />
          <div className="flex-1">{children}</div>
          <Footer />
        </QueryProvider>
      </body>
    </html>
  );
}
