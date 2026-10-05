export type PlanType = "gratis" | "dest" | "pro" | "banner";
export type PricingType = "fixed" | "custom";

export interface PlanPrice {
  id: string;
  amount: number;
  currency: string;
  promo_label: string | null;
}

export interface Plan {
  id: string;
  name: string;
  plan_type: PlanType;
  pricing_type: PricingType;
  description: string | null;
  is_active: boolean;
  price: PlanPrice | null;
  /** Etapa 11a — BUG 2: false mientras MERCADOPAGO_ACCESS_TOKEN no esté
   * configurado (pagos manuales por ahora) — oculta "Contratar con
   * MercadoPago" y deja solo la transferencia manual. */
  mercadopago_available: boolean;
}

export interface CheckoutResponse {
  init_point: string;
}

/** Admin — fila del historial de precios de un plan (`plan_prices`). Las
 * fechas son días calendario (`YYYY-MM-DD`); `valid_until` null = vigente
 * sin fecha de cierre. */
export interface AdminPlanPrice {
  id: string;
  amount: number;
  currency: string;
  valid_from: string;
  valid_until: string | null;
  promo_label: string | null;
  notes: string | null;
}

/** GET /api/admin/plans — planes pagos de precio fijo (dest/pro). */
export interface AdminPlanPricing {
  id: string;
  name: string;
  plan_type: PlanType;
  is_active: boolean;
  current_price: AdminPlanPrice | null;
  history: AdminPlanPrice[];
}

export interface PlanPriceCreateInput {
  amount: number;
  promo_label: string | null;
}
