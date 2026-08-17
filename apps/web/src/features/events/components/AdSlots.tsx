import { Megaphone } from "lucide-react";

// Sin modelo/tabla de publicidad todavía: ver a_revisar.md
function AdPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-surface-4 bg-surface-2 text-ink-5 ${className ?? ""}`}
    >
      <Megaphone className="h-5 w-5 text-brand-pink/40" aria-hidden />
      <span className="text-[10px] font-semibold">Espacio publicitario</span>
    </div>
  );
}

export function AdSlots() {
  return (
    <div className="px-4 pt-3.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-5">
          <Megaphone className="h-2.5 w-2.5 text-primary" aria-hidden />
          Publicidad
        </span>
        <em className="text-[9px] not-italic text-primary">Home · 3 slots</em>
      </div>
      <AdPlaceholder className="mb-2 w-full aspect-[3.2/1] md:aspect-[3.88/1]" />
      <div className="grid grid-cols-2 gap-2.5">
        <AdPlaceholder className="aspect-square md:aspect-[6/5]" />
        <AdPlaceholder className="aspect-square md:aspect-[6/5]" />
      </div>
    </div>
  );
}
