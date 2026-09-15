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

/** Etapa "Admin de reportes de lugares": `event_title` se generalizó a
 * target_title/target_type — cubre reportes de evento y de lugar con el
 * mismo campo. No extiende `Report` (ahí event_id no es nullable, pensado
 * para el reporte de evento del usuario) porque acá exactamente uno de
 * event_id/location_id viene seteado, según target_type. */
export interface AdminReport {
  id: string;
  event_id: string | null;
  location_id: string | null;
  text: string;
  contact_phone: string;
  created_at: string;
  status: ReportStatus;
  target_title: string;
  target_type: "event" | "location";
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
