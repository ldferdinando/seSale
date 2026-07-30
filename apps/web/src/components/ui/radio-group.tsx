import * as React from "react";

import { cn } from "@/lib/utils";

interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupProps {
  name: string;
  value: string;
  options: RadioOption[];
  onChange: (value: string) => void;
  className?: string;
}

function RadioGroup({ name, value, options, onChange, className }: RadioGroupProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="radiogroup">
      {options.map((option) => {
        const checked = value === option.value;
        return (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              checked
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-ink-2 hover:border-primary/40",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="h-3.5 w-3.5 accent-primary"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

export { RadioGroup };
