"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { Sheet } from "@/components/ui/sheet";
import { Tabs } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface AdminSection {
  value: string;
  label: string;
}

interface AdminSectionNavProps {
  sections: AdminSection[];
  value: string;
  onChange: (value: string) => void;
}

/**
 * Navegación entre secciones del panel admin — Etapa admin-responsive-1.
 *
 * - Desktop (>= md): tabs horizontales sin cambios (mismo componente Tabs
 *   de siempre, mismo comportamiento).
 * - Mobile (< md): las tabs horizontales forzaban scroll lateral, así que
 *   se reemplazan por un botón de menú (hamburguesa) que abre un drawer
 *   (Sheet) con la lista de secciones. Elegir una sección navega y cierra
 *   el drawer.
 */
export function AdminSectionNav({ sections, value, onChange }: AdminSectionNavProps) {
  const [open, setOpen] = useState(false);
  const currentLabel = sections.find((section) => section.value === value)?.label ?? "";

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <>
      <div className="hidden md:block">
        <Tabs tabs={sections} value={value} onChange={onChange} />
      </div>

      <div className="flex items-center justify-between border-b border-border pb-3 md:hidden">
        <span className="text-sm font-bold text-foreground">{currentLabel}</span>
        <button
          type="button"
          aria-label="Abrir menú de secciones"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-ink-2"
        >
          <Menu className="h-4 w-4" aria-hidden />
          Secciones
        </button>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Secciones del panel">
        <nav aria-label="Secciones del panel" className="flex flex-col gap-1">
          {sections.map((section) => (
            <button
              key={section.value}
              type="button"
              aria-current={section.value === value ? "page" : undefined}
              onClick={() => handleSelect(section.value)}
              className={cn(
                "rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
                section.value === value ? "bg-primary/10 text-primary" : "text-ink-2 hover:bg-muted",
              )}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </Sheet>
    </>
  );
}
