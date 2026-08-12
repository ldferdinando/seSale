import { apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { AdminReport, AdminReportFilters, Report, ReportCreateInput, ReportStatus } from "@/features/reports/types";

export async function reportEvent(eventId: string, input: ReportCreateInput): Promise<Report> {
  return apiPost<Report>(`/api/events/${eventId}/report`, input);
}

export async function fetchAdminReports(filters: AdminReportFilters = {}): Promise<AdminReport[]> {
  return apiGet<AdminReport[]>("/api/admin/reports", filters as Record<string, string | undefined>);
}

export async function updateReportStatus(reportId: string, status: ReportStatus): Promise<AdminReport> {
  return apiPatch<AdminReport>(`/api/admin/reports/${reportId}/status`, { status });
}
