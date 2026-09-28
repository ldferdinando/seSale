"use client";

import { LayoutGrid } from "lucide-react";

import { useGastroTypeCatalog } from "@/features/gastro/hooks/useGastroTypeCatalog";
import { DEFAULT_GASTRO_TYPE_STYLE, GASTRO_TYPE_STYLES } from "@/features/gastro/lib/gastroTypeStyles";
import type { GastroTypeGrupo } from "@/features/gastro/types";
import { cn } from "@/lib/utils";

interface GastroTypeChipsProps {
  grupo: GastroTypeGrupo;
  gastroType: string | null;
  onChange: (gastroType: string | null) => void;
}

/**
 * Chips de tipo gastronómico — calcados de #s-lugares .tipo-chips en
 * seSALE.html (setTipo()): `flex-wrap`, bajan de línea cuando no entran en
 * una fila (no hay scroll horizontal — fix del error de la etapa anterior,
 * que le había agregado overflow-x + scrollbar oculta). Etapa 12a: tipos
 * cargados dinámicamente desde GET /api/gastro-types (ver useGastroTypeCatalog).
 * Etapa "Gastronomía y otros": `grupo` filtra qué tipos se muestran
 * (Gastronomía | Espacios, ver setGrupoLug en seSALE.html) — mismo listado
 * de chips de siempre, solo cambia el subconjunto según el grupo activo.
 */
export function GastroTypeChips({ grupo, gastroType, onChange }: GastroTypeChipsProps) {
  const { types: allTypes } = useGastroTypeCatalog();
  const types = allTypes.filter((t) => t.grupo === grupo);

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-1" data-testid="gastro-type-chips">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
          gastroType === null ? "on bg-primary text-primary-foreground" : "border border-border bg-card text-ink-2",
        )}
      >
        <LayoutGrid className="h-4 w-4" aria-hidden />
        Todos
      </button>

      {types.map((option) => {
        const style = GASTRO_TYPE_STYLES[option.key] ?? DEFAULT_GASTRO_TYPE_STYLE;
        const Icon = style.icon;
        const on = gastroType === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(on ? null : option.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
              on ? "on bg-primary text-primary-foreground" : "border border-border bg-card text-ink-2",
            )}
          >
            {option.emoji ? (
              <span aria-hidden>{option.emoji}</span>
            ) : (
              <Icon className="h-4 w-4" style={{ color: on ? "#fff" : style.color }} aria-hidden />
            )}
            {option.name}
          </button>
        );
      })}
    </div>
  );
}
