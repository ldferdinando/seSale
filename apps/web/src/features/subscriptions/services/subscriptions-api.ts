import { apiGet, apiPatch, apiPost } from "@/lib/api-client";
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

export async function transferSubscription(
  planId: string,
  eventId: string,
  note: string | undefined,
): Promise<Subscription> {
  return apiPost<Subscription>("/api/subscriptions/transfer", {
    plan_id: planId,
    event_id: eventId,
    note: note || null,
  });
}

export async function reviewSubscription(
  subscriptionId: string,
  action: "approve" | "reject",
  adminNotes: string | undefined,
): Promise<AdminSubscription> {
  return apiPatch<AdminSubscription>(`/api/admin/subscriptions/${subscriptionId}/review`, {
    action,
    admin_notes: adminNotes || null,
  });
}
