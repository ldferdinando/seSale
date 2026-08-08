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
}

export interface CheckoutResponse {
  init_point: string;
}
