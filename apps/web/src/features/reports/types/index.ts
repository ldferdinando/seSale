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

/** Respuesta de POST /api/gastro/{id}/report — etapa "Ficha de Lugar v2.2".
 * Mismo modelo Report del backend, generalizado a event_id | location_id;
 * acá solo se consume desde el modal (que no lee estos campos, solo si la
 * mutación tuvo éxito), así que no hace falta más que esto. */
export interface LocationReport {
  id: string;
  location_id: string;
  text: string;
  contact_phone: string;
  created_at: string;
  status: ReportStatus;
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
