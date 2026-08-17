import { ArrowLeft, Store } from "lucide-react";
import Link from "next/link";

// Placeholder de la Etapa 8b — el ABM completo de Gastronomía y otros
// lugares (bares, restaurantes, etc. con horario, delivery, redes) es la
// Etapa 8e. Ver a_revisar.md.
export default function LugaresPage() {
  return (
    <main className="container mx-auto flex max-w-2xl flex-col gap-6 py-6">
      <header className="flex items-center gap-3 border-b border-border pb-3 text-ink-3">
        <Link href="/" className="flex items-center gap-3">
          <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
        </Link>
        <span className="text-sm font-medium">Gastronomía y otros</span>
      </header>

      <div className="mx-4 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-4 bg-surface-2 px-6 py-16 text-center">
        <Store className="h-9 w-9 text-ink-5" aria-hidden />
        <p className="text-sm font-bold text-ink-3">Próximamente</p>
        <p className="max-w-[260px] text-xs text-ink-5">
          Bares, restaurantes, cervecerías y más lugares de tu ciudad, muy pronto acá.
        </p>
      </div>
    </main>
  );
}
