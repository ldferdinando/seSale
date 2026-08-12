"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

interface TimePickerProps {
  id?: string;
  /** Prefijo usado para los aria-label de hora/minutos (ej. "Hora inicio"). */
  label: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Selector de hora en formato 24hs, siempre — a diferencia de
 * `<input type="time">`, cuyo AM/PM depende del locale del sistema
 * operativo y no se puede forzar desde la app. `value`/`onChange` usan
 * "HH:mm".
 */
export function TimePicker({ id, label, value, onChange }: TimePickerProps) {
  const [hour, minute] = value ? value.split(":") : ["", ""];

  function setHour(nextHour: string) {
    onChange(`${nextHour}:${minute || "00"}`);
  }

  function setMinute(nextMinute: string) {
    onChange(`${hour || "00"}:${nextMinute}`);
  }

  return (
    <div id={id} className="flex items-center gap-1.5">
      <Select value={hour || undefined} onValueChange={setHour}>
        <SelectTrigger className="w-[4.5rem]" aria-label={`${label} — hora`}>
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-sm font-bold text-ink-3" aria-hidden>
        :
      </span>
      <Select value={minute || undefined} onValueChange={setMinute}>
        <SelectTrigger className="w-[4.5rem]" aria-label={`${label} — minutos`}>
          <SelectValue placeholder="mm" />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
