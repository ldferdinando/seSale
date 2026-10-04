import type { LucideIcon } from "lucide-react";

export interface ContactLinkItem {
  /** Clave estable para React (ej. "whatsapp"). */
  key: string;
  /** null/undefined = el medio no está cargado → no se renderiza. */
  href: string | null | undefined;
  label: string;
  icon: LucideIcon;
  iconClassName: string;
  /** false para mailto:/tel: (no abren pestaña nueva). Default: true. */
  external?: boolean;
  testId?: string;
}

interface ContactLinksProps {
  items: ContactLinkItem[];
}

/**
 * Lista de medios de contacto, uno por fila, renderizando solo los que
 * tienen `href` — patrón de la Ficha de Lugar (GastroDetailView) extraído
 * para reusarlo en el bloque "Usuario verificado" del detalle de evento.
 * No renderiza nada si ningún medio está cargado; el título de la sección
 * queda a cargo de quien lo usa.
 */
export function ContactLinks({ items }: ContactLinksProps) {
  const available = items.filter((item) => Boolean(item.href));
  if (available.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {available.map(({ key, href, label, icon: Icon, iconClassName, external = true, testId }) => (
        <a
          key={key}
          href={href ?? undefined}
          {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
          data-testid={testId}
          className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm font-semibold text-foreground"
        >
          <Icon className={`h-4 w-4 ${iconClassName}`} aria-hidden />
          {label}
        </a>
      ))}
    </div>
  );
}
