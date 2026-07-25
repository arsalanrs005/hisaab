"use server";

import {
  buildReportLines,
  getWorkspaceBackupPayload,
  type ReportFilters,
} from "@/data/reports/queries";

export async function exportMonthlyCsvAction(filters: ReportFilters) {
  const report = await buildReportLines(filters);
  const headers = ["Date", "Name", "Type", "Amount PKR", "Account", "Category"];
  const csv = [
    headers.join(","),
    ...report.csvRows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");
  return {
    ok: true as const,
    filename: `hisab-${filters.reportType ?? "monthly"}-report.csv`,
    content: csv,
    headers,
    rows: report.csvRows,
  };
}

export async function exportWorkspaceBackupAction(filters?: Partial<ReportFilters>) {
  const backup = await getWorkspaceBackupPayload(filters);
  return {
    ok: true as const,
    filename: `hisab-backup-${new Date().toISOString().slice(0, 10)}.json`,
    content: JSON.stringify(backup, null, 2),
  };
}
