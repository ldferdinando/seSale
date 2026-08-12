import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateReportStatus } from "@/features/reports/services/reports-api";
import type { ReportStatus } from "@/features/reports/types";

export function useUpdateReportStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reportId, status }: { reportId: string; status: ReportStatus }) =>
      updateReportStatus(reportId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    },
  });
}
