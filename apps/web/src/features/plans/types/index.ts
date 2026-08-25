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
