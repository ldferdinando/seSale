"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { searchEmojiGroups } from "@/lib/emoji-catalog";
import { cn } from "@/lib/utils";

// En desktop (sobre todo Linux) no hay un teclado de emojis a mano, así que
// tipear uno en el input no es realista: se elige con un clic de la grilla
// (con buscador en español). El input queda para pegar cualquier otro.

interface EmojiPickerProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function EmojiPicker({ id, value, onChange, placeholder }: EmojiPickerProps) {
  const [query, setQuery] = useState("");
  const groups = searchEmojiGroups(query);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={10}
          placeholder={placeholder}
          className="w-24"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-ink-4 underline-offset-2 hover:underline"
          >
            Quitar
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          // Está dentro del <form> del tipo: Enter no debe guardarlo.
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          placeholder="Buscar: teatro, museo, boliche, peña…"
          aria-label="Buscar emoji"
          className="pl-8"
        />
      </div>

      <div
        role="group"
        aria-label="Elegir emoji"
        className="flex max-h-64 flex-col gap-3 overflow-y-auto rounded-lg border border-border p-2"
      >
        {groups.length === 0 && (
          <p className="text-xs text-ink-4">Sin resultados. Podés pegar cualquier emoji en el campo de arriba.</p>
        )}
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-4">{group.label}</p>
            <div className="flex flex-wrap gap-1">
              {group.emojis.map(({ emoji, keywords }) => {
                const selected = value === emoji;
                return (
                  <button
                    key={emoji}
                    type="button"
                    title={keywords}
                    aria-label={`Usar ${emoji}`}
                    aria-pressed={selected}
                    onClick={() => onChange(emoji)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg border text-base transition-colors",
                      selected ? "border-primary bg-primary/15" : "border-border bg-card hover:bg-surface-2",
                    )}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
