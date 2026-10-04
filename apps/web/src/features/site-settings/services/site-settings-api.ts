import { apiGet, apiPatch } from "@/lib/api-client";
import type { AdminSiteSettings, SiteSettings, SiteSettingsUpdateInput } from "@/features/site-settings/types";

export async function fetchSiteSettings(): Promise<SiteSettings> {
  return apiGet<SiteSettings>("/api/site-settings");
}

export async function fetchAdminSiteSettings(): Promise<AdminSiteSettings> {
  return apiGet<AdminSiteSettings>("/api/admin/site-settings");
}

export async function updateSiteSettings(input: SiteSettingsUpdateInput): Promise<AdminSiteSettings> {
  return apiPatch<AdminSiteSettings>("/api/admin/site-settings", input);
}
