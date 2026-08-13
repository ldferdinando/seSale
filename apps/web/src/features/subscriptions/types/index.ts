import type { PlanType } from "@/features/plans/types";

export type SubscriptionStatus = "active" | "expired" | "cancelled" | "pending_payment" | "pending_approval";
export type PaymentMethod = "mercadopago" | "transfer" | "manual";

export interface Subscription {
  id: string;
  plan_id: string;
  plan_name: string;
  plan_type: PlanType;
  status: SubscriptionStatus;
  payment_method: PaymentMethod;
  starts_at: string;
  expires_at: string;
  amount_paid: number;
  currency: string;
  promo_label: string | null;
  mp_payment_id: string | null;
  transfer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  /** Etapa 6b-2: el plan se compra para un evento puntual, no para la cuenta. */
  event_id: string | null;
  event_title: string | null;
}

export interface AdminSubscription extends Subscription {
  user_id: string;
  user_email: string;
  user_public_name: string;
}
