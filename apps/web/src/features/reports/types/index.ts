export type ReportStatus = "pending" | "reviewed" | "dismissed";

export interface ReportCreateInput {
  text: string;
  contact_phone: string;
}

export interface Report {
  id: string;
  event_id: string;
  text: string;
  contact_phone: string;
  created_at: string;
  status: ReportStatus;
}

export interface AdminReport extends Report {
  event_title: string;
}

export interface AdminReportFilters {
  status?: ReportStatus;
  event_id?: string;
  date_from?: string;
  date_to?: string;
}

export const REPORT_STATUS_OPTIONS: { value: ReportStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "reviewed", label: "Revisado" },
  { value: "dismissed", label: "Descartado" },
];
