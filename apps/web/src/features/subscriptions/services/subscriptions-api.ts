import { apiGet, apiPatch } from "@/lib/api-client";
import type { AdminSubscription, Subscription } from "@/features/subscriptions/types";

export async function fetchMySubscriptions(): Promise<Subscription[]> {
  return apiGet<Subscription[]>("/api/subscriptions/me");
}

export interface AdminSubscriptionFilters {
  status?: string;
  plan_id?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
}

export async function fetchAdminSubscriptions(filters: AdminSubscriptionFilters = {}): Promise<AdminSubscription[]> {
  return apiGet<AdminSubscription[]>("/api/admin/subscriptions", filters as Record<string, string | undefined>);
}

export async function activateSubscription(subscriptionId: string, expiresAt: string): Promise<AdminSubscription> {
  return apiPatch<AdminSubscription>(`/api/admin/subscriptions/${subscriptionId}/activate`, { expires_at: expiresAt });
}
