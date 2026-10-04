"use client";

import type { ReactNode } from "react";

import { useIsDesktopViewport } from "@/features/admin/hooks/useIsDesktopViewport";
import { cn } from "@/lib/utils";

/**
 * Definición declarativa de una columna — Etapa admin-responsive-1.
 *
 * `essential` marca la columna como "siempre visible" incluso si en el
 * futuro se agrega una vista tarjeta colapsada (por ahora, en mobile, TODAS
 * las columnas se muestran igual — el flag solo queda preparado para que
 * las próximas secciones lo usen si hace falta esconder columnas
 * secundarias en una vista compacta).
 */
export interface AdminTableColumn<T> {
  /** Identificador único de la columna (key de React, no se muestra). */
  key: string;
  /** Encabezado en desktop / etiqueta en la tarjeta mobile. */
  label: string;
  /** Siempre visible aunque en el futuro se agregue una vista colapsada. */
  essential?: boolean;
  /** Cómo renderizar el valor de esta columna para una fila dada. */
  render: (row: T) => ReactNode;
  /** Clases extra para el <th>/<td> en la vista desktop. */
  className?: string;
}

interface ResponsiveAdminTableProps<T> {
  columns: AdminTableColumn<T>[];
  data: T[];
  /** Key de React para cada fila. */
  getRowKey: (row: T) => string;
  /** Acciones por fila (editar, eliminar, etc.) — visibles en ambas vistas. */
  renderActions?: (row: T) => ReactNode;
  /** data-testid de cada fila (tabla desktop y tarjeta mobile) — por
   * compatibilidad con tests existentes que buscan filas por testid. */
  rowTestId?: string;
  /** Contenido a mostrar cuando `data` está vacío. Si no se pasa, no se
   * renderiza nada especial (el caller maneja el estado vacío afuera). */
  emptyMessage?: ReactNode;
  className?: string;
}

/**
 * Tabla de administración responsive — Etapa admin-responsive-1.
 *
 * En desktop (>= md) se comporta como una tabla HTML normal. En mobile
 * (< md) cada fila se transforma en una tarjeta apilada: una vez por
 * columna, "etiqueta: valor", sin scroll horizontal. Recibe las columnas de
 * forma declarativa así el mismo componente sirve para cualquier sección
 * del admin (Eventos, y después Lugares/Categorías/Reportes/Usuarios) sin
 * tocar la lógica de layout — solo cambia la lista de columnas.
 *
 * Nota de implementación: se elige renderizar UNA sola de las dos vistas
 * por vez (según useIsDesktopViewport), no las dos ocultas con CSS. Ocultar
 * con CSS duplicaría cada fila en el DOM (dos veces el mismo texto/botón),
 * lo que rompe accesibilidad (contenido leído dos veces) y tests que
 * cuentan filas o buscan un botón por nombre.
 */
export function ResponsiveAdminTable<T>({
  columns,
  data,
  getRowKey,
  renderActions,
  rowTestId,
  emptyMessage,
  className,
}: ResponsiveAdminTableProps<T>) {
  const isDesktop = useIsDesktopViewport();

  if (data.length === 0) {
    return emptyMessage ? <>{emptyMessage}</> : null;
  }

  if (isDesktop) {
    // Las acciones van en una fila propia debajo de cada registro, a todo
    // el ancho, y no como última columna: el panel admin es angosto
    // (max-w-2xl) y con 5-6 columnas la columna "Acciones" quedaba cortada
    // por el `overflow-hidden` del contenedor — en desktop no se veían
    // Aprobar/Rechazar. Cada registro es su propio <tbody> (con el testid)
    // para que fila de datos + fila de acciones sigan siendo una unidad.
    return (
      <div className={cn("overflow-x-auto rounded-lg border border-border", className)}>
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wide text-ink-4">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={cn("px-3 py-2", column.className)}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          {data.map((row) => (
            <tbody key={getRowKey(row)} data-testid={rowTestId} className="border-t border-border">
              <tr className="align-top">
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-3 pt-3", renderActions ? "pb-2" : "pb-3", column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
              {renderActions && (
                <tr>
                  <td colSpan={columns.length} className="px-3 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {renderActions(row)}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          ))}
        </table>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {data.map((row) => (
        <div
          key={getRowKey(row)}
          data-testid={rowTestId}
          className="flex flex-col gap-2 rounded-lg border border-border p-3"
        >
          {columns.map((column) => (
            <div key={column.key} className="flex flex-col gap-0.5 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-4">{column.label}</span>
              <div className="break-words text-foreground">{column.render(row)}</div>
            </div>
          ))}
          {renderActions && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">{renderActions(row)}</div>
          )}
        </div>
      ))}
    </div>
  );
}
