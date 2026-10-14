import type { PriceMode } from "@/features/events/types";

/**
 * Texto a mostrar para `price_mode="consultar"`/`"ver_descripcion"` —
 * reemplaza el monto numérico en todo lugar donde se muestra el precio de
 * un evento pago (card, detalle, resumen de publicación). Solo tiene
 * sentido con `ticket_type="pago"` (ver apps/api/app/schemas/event.py,
 * `_validate_price_mode`) — "anticipo" siempre usa montos numéricos.
 *
 * "Consultar precio" reusa el mismo texto que ya usa el plan Banner de
 * /planes cuando no tiene un monto fijo (ver features/plans/lib/plan-price.ts).
 */
export function priceModeLabel(priceMode: PriceMode): string | null {
  switch (priceMode) {
    case "consultar":
      return "Consultar precio";
    case "ver_descripcion":
      return "Ver precios en la descripción";
    case "fixed":
      return null;
  }
}
