"use client";

import { LayoutGrid } from "lucide-react";

import { DEFAULT_GASTRO_TYPE_STYLE, GASTRO_TYPE_STYLES } from "@/features/gastro/lib/gastroTypeStyles";
import { GASTRO_TYPE_OPTIONS } from "@/features/gastro/types";
import { cn } from "@/lib/utils";

interface GastroTypeChipsProps {
  gastroType: string | null;
  onChange: (gastroType: string | null) => void;
}

/**
 * Chips de tipo gastronómico — calcados de #s-lugares .tipo-chips en
 * seSALE.html (setTipo()), scrolleables horizontalmente en una sola fila
 * (pedido explícito de la Etapa 8e — ver a_revisar.md sobre la diferencia
 * con el CSS del HTML, que en cambio hace flex-wrap).
 */
export function GastroTypeChips({ gastroType, onChange }: GastroTypeChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-1" data-testid="gastro-type-chips">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "flex flex-shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
          gastroType === null ? "on bg-primary text-primary-foreground" : "border border-border bg-card text-ink-2",
        )}
      >
        <LayoutGrid className="h-4 w-4" aria-hidden />
        Todos
      </button>

      {GASTRO_TYPE_OPTIONS.map((option) => {
        const style = GASTRO_TYPE_STYLES[option.value] ?? DEFAULT_GASTRO_TYPE_STYLE;
        const Icon = style.icon;
        const on = gastroType === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(on ? null : option.value)}
            className={cn(
              "flex flex-shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
              on ? "on bg-primary text-primary-foreground" : "border border-border bg-card text-ink-2",
            )}
          >
            <Icon className="h-4 w-4" style={{ color: on ? "#fff" : style.color }} aria-hidden />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
