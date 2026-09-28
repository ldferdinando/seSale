"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Sugerencias para tipos de lugar/categorías. En desktop (sobre todo Linux)
// no hay un teclado de emojis a mano, así que tipear uno en el input no es
// realista: se elige con un clic. El input queda para pegar cualquier otro.
export const EMOJI_SUGGESTIONS = [
  // Espacios / cultura
  "🎭", "🎶", "🎸", "🎤", "🎷", "🎨", "🏛️", "🎪", "🎬", "📚", "💃", "🎲", "🎳", "⚽", "🏟️", "🌳", "⛺", "🏠",
  // Gastronomía
  "🍺", "🍷", "🍸", "🍹", "☕", "🍽️", "🥩", "🍕", "🍔", "🌮", "🍣", "🥗", "🍦", "🧁", "🥐", "🥡", "🏪", "🛒",
] as const;

interface EmojiPickerProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function EmojiPicker({ id, value, onChange, placeholder }: EmojiPickerProps) {
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
      <div role="group" aria-label="Elegir emoji" className="flex flex-wrap gap-1">
        {EMOJI_SUGGESTIONS.map((emoji) => {
          const selected = value === emoji;
          return (
            <button
              key={emoji}
              type="button"
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
  );
}
