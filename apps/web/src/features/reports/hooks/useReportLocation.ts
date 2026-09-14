import { useMutation } from "@tanstack/react-query";

import { reportLocation } from "@/features/reports/services/reports-api";
import type { ReportCreateInput } from "@/features/reports/types";

export function useReportLocation(locationId: string) {
  return useMutation({
    mutationFn: (input: ReportCreateInput) => reportLocation(locationId, input),
  });
}
