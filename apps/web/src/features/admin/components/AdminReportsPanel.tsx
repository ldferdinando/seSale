"use client";

import { format, parseISO } from "date-fns";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminReports } from "@/features/reports/hooks/useAdminReports";
import { useUpdateReportStatus } from "@/features/reports/hooks/useUpdateReportStatus";
import type { AdminReport, ReportStatus } from "@/features/reports/types";
import { formatEventTime, toEventDateTimeISO } from "@/lib/date-helpers";

const STATUS_LABEL: Record<ReportStatus, string> = {
  pending: "Pendiente",
  reviewed: "Revisado",
  dismissed: "Descartado",
};

const STATUS_BADGE_VARIANT: Record<ReportStatus, "default" | "pro" | "muted"> = {
  pending: "default",
  reviewed: "pro",
  dismissed: "muted",
};

function ReportRow({ report }: { report: AdminReport }) {
  const updateStatus = useUpdateReportStatus();

  return (
    <div data-testid="admin-report-row" className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/eventos/${report.event_id}`} className="text-sm font-bold text-primary hover:underline">
          {report.event_title}
        </Link>
        <Badge variant={STATUS_BADGE_VARIANT[report.status]}>{STATUS_LABEL[report.status]}</Badge>
      </div>

      <p className="text-sm text-foreground">{report.text}</p>

      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-4">
        <span>Tel: {report.contact_phone}</span>
        <span>
          {format(parseISO(report.created_at), "d MMM yyyy")} ·{" "}
          {formatEventTime(toEventDateTimeISO(report.created_at.slice(0, 10), report.created_at.slice(11, 19)))} hs
        </span>
      </div>

      {report.status === "pending" && (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            disabled={updateStatus.isPending}
            onClick={() => updateStatus.mutate({ reportId: report.id, status: "reviewed" })}
          >
            Marcar revisado
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={updateStatus.isPending}
            onClick={() => updateStatus.mutate({ reportId: report.id, status: "dismissed" })}
          >
            Descartar
          </Button>
        </div>
      )}
    </div>
  );
}

export function AdminReportsPanel() {
  const { data: reports, isLoading, isError } = useAdminReports();

  return (
    <section className="flex flex-col gap-4">
      <h2 className="px-1 text-lg font-bold text-foreground">Reportes</h2>

      {isLoading && (
        <div data-testid="admin-reports-loading" className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {isError && (
        <p role="alert" className="text-sm text-muted-foreground">
          No pudimos cargar los reportes. Intentá de nuevo más tarde.
        </p>
      )}

      {reports && reports.length === 0 && (
        <p className="text-sm text-muted-foreground">Todavía no hay reportes cargados.</p>
      )}

      {reports && reports.length > 0 && (
        <div className="flex flex-col gap-3">
          {reports.map((report) => (
            <ReportRow key={report.id} report={report} />
          ))}
        </div>
      )}
    </section>
  );
}
