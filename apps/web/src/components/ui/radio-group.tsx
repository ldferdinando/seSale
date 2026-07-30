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
    <div className={cn("flex flex-wrap gap-4", className)} role="radiogroup">
      {options.map((option) => (
        <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="h-4 w-4 accent-primary"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

export { RadioGroup };
