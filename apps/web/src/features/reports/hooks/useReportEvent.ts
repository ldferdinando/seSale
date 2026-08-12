import { useMutation } from "@tanstack/react-query";

import { reportEvent } from "@/features/reports/services/reports-api";
import type { ReportCreateInput } from "@/features/reports/types";

export function useReportEvent(eventId: string) {
  return useMutation({
    mutationFn: (input: ReportCreateInput) => reportEvent(eventId, input),
  });
}
