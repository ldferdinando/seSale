import type { PlanType } from "@/features/plans/types";

export type SubscriptionStatus = "active" | "expired" | "cancelled" | "pending_payment";

export interface Subscription {
  id: string;
  plan_id: string;
  plan_name: string;
  plan_type: PlanType;
  status: SubscriptionStatus;
  starts_at: string;
  expires_at: string;
  amount_paid: number;
  currency: string;
  promo_label: string | null;
  mp_payment_id: string | null;
  created_at: string;
}

export interface AdminSubscription extends Subscription {
  user_id: string;
  user_email: string;
  user_public_name: string;
}
