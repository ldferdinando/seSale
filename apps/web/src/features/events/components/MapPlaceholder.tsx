import { MapPinned } from "lucide-react";

// Sin coordenadas ni proveedor de mapas integrado todavía: ver a_revisar.md
export function MapPlaceholder() {
  return (
    <div className="mx-4 my-3.5 flex h-[340px] flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface-0">
      <MapPinned className="h-9 w-9 text-ink-5" aria-hidden />
      <p className="text-sm font-bold text-ink-3">El mapa está en camino</p>
      <p className="max-w-[220px] text-center text-xs text-ink-5">
        Pronto vas a poder ver los eventos ubicados en el mapa de tu ciudad.
      </p>
    </div>
  );
}
