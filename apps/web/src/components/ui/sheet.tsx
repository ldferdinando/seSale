"use client";

import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Usado como aria-label del dialog y como título visible del panel. */
  title: string;
  children: React.ReactNode;
  side?: "left" | "right";
  className?: string;
}

/**
 * Drawer/sheet lateral construido a mano — el proyecto no tiene
 * @radix-ui/react-dialog instalado (ver ConfirmDialog.tsx, mismo criterio:
 * no sumar una dependencia nueva para un overlay simple).
 *
 * Maneja: cierre con click en el overlay, cierre con Escape, foco inicial
 * en el panel al abrir y devolución del foco al elemento que lo abrió al
 * cerrar.
 */
export function Sheet({ open, onClose, title, children, side = "left", className }: SheetProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex bg-black/60" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "flex h-full w-72 max-w-[85vw] flex-col gap-1 overflow-y-auto bg-card p-4 shadow-xl outline-none",
          side === "left" ? "mr-auto" : "ml-auto",
          className,
        )}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={onClose}
            className="rounded-md p-1 text-ink-3 hover:bg-muted"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
