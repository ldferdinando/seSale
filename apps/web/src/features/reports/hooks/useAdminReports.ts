import { useQuery } from "@tanstack/react-query";

import { fetchAdminReports } from "@/features/reports/services/reports-api";
import type { AdminReportFilters } from "@/features/reports/types";

export function useAdminReports(filters: AdminReportFilters = {}) {
  return useQuery({
    queryKey: ["admin-reports", filters],
    queryFn: () => fetchAdminReports(filters),
  });
}
