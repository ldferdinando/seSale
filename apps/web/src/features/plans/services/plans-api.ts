import { apiGet, apiPost } from "@/lib/api-client";
import type { CheckoutResponse, Plan } from "@/features/plans/types";

export async function fetchPlans(): Promise<Plan[]> {
  return apiGet<Plan[]>("/api/plans");
}

export async function checkoutPlan(planId: string, eventId: string): Promise<CheckoutResponse> {
  return apiPost<CheckoutResponse>("/api/subscriptions/checkout", { plan_id: planId, event_id: eventId });
}
