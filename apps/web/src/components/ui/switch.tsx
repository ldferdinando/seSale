import * as React from "react";

import { cn } from "@/lib/utils";

interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

// Rail 44px (w-11) with 2px padding (p-0.5) → 40px inner track; thumb 20px (h-5 w-5).
// Travel = 40 - 20 = 20px (translate-x-5), so the thumb stays inside the rail in both states.
const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        checked ? "bg-[#1D9E75]" : "bg-surface-5",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "block h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  ),
);
Switch.displayName = "Switch";

export { Switch };
