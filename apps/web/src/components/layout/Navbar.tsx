import Link from "next/link";

import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="relative h-[72px] overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-primary to-transparent" />
        <div className="container mx-auto flex h-full max-w-2xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-foreground">se</span>
            <span className="text-xl font-black tracking-tight text-primary">SALE</span>
            <span className="mb-1 h-[7px] w-[7px] flex-shrink-0 animate-pulse rounded-full bg-primary" />
          </Link>

          <nav className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href="/mis-eventos">Mis eventos</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full">
              <Link href="/publicar">Publicar evento</Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
