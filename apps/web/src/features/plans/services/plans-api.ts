import { apiGet, apiPost } from "@/lib/api-client";
import type {
  AdminPlanPrice,
  AdminPlanPricing,
  CheckoutResponse,
  Plan,
  PlanPriceCreateInput,
} from "@/features/plans/types";

export async function fetchPlans(): Promise<Plan[]> {
  return apiGet<Plan[]>("/api/plans");
}

export async function checkoutPlan(planId: string, eventId: string): Promise<CheckoutResponse> {
  return apiPost<CheckoutResponse>("/api/subscriptions/checkout", { plan_id: planId, event_id: eventId });
}

export async function fetchAdminPlanPricing(): Promise<AdminPlanPricing[]> {
  return apiGet<AdminPlanPricing[]>("/api/admin/plans");
}

export async function createPlanPrice(planId: string, input: PlanPriceCreateInput): Promise<AdminPlanPrice> {
  return apiPost<AdminPlanPrice>(`/api/admin/plans/${planId}/prices`, input);
}
