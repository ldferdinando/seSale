import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";
import { Navbar } from "@/components/layout/Navbar";
import { AuthProvider } from "@/features/auth/components/AuthProvider";
import { ActiveCityProvider } from "@/features/cities/context/ActiveCityContext";
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
      <body className="flex min-h-screen flex-col pb-[70px]">
        <QueryProvider>
          <AuthProvider>
            <ActiveCityProvider>
              <Navbar />
              <div className="flex-1">{children}</div>
              <BottomNav />
            </ActiveCityProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
