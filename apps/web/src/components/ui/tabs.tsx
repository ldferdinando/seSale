"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface Tab {
  value: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div className={cn("flex gap-2 border-b border-border", className)} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            value === tab.value
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export { Tabs };
