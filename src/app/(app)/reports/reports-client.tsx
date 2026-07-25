"use client";

import * as React from "react";
import {
  FileText,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Target,
  Landmark,
  Briefcase,
  Download,
  FileSpreadsheet,
  FileDown,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AccountWithMeta } from "@/data/accounts/mappers";
import { exportMonthlyCsvAction, exportWorkspaceBackupAction } from "@/data/reports/mutations";
import { downloadCsv, downloadJson } from "@/lib/exports/download";
import { downloadExcel } from "@/lib/exports/excel";
import { downloadPdf } from "@/lib/exports/pdf";
import { formatMonthYear } from "@/lib/format";
import { useApp } from "@/providers/app-provider";
import { cn } from "@/lib/utils";

type ReportId =
  | "monthly"
  | "income"
  | "expense"
  | "savings"
  | "goal"
  | "statement"
  | "ops5ive";

interface ReportDef {
  id: ReportId;
  title: string;
  description: string;
  icon: typeof FileText;
  period: string;
}

const reports: ReportDef[] = [
  {
    id: "monthly",
    title: "Monthly summary",
    description: "Income, expenses, net saved, and savings rate for the selected period.",
    icon: FileText,
    period: "Monthly",
  },
  {
    id: "income",
    title: "Income report",
    description: "Cleared and expected income by source, person, and account.",
    icon: TrendingUp,
    period: "Custom range",
  },
  {
    id: "expense",
    title: "Expense report",
    description: "Spending by category with budget variance and month-over-month change.",
    icon: TrendingDown,
    period: "Custom range",
  },
  {
    id: "savings",
    title: "Savings report",
    description: "Protected versus available balances and progress against the savings plan.",
    icon: PiggyBank,
    period: "Monthly",
  },
  {
    id: "goal",
    title: "Goal progress",
    description: "Contribution history, remaining amounts, and projected completion dates.",
    icon: Target,
    period: "Year to date",
  },
  {
    id: "statement",
    title: "Account statement",
    description: "Ledger-style statement for one account with opening and closing balances.",
    icon: Landmark,
    period: "Custom range",
  },
  {
    id: "ops5ive",
    title: "Ops5ive business",
    description: "MRR, project revenue, expenses, employee payments, and net profit.",
    icon: Briefcase,
    period: "Monthly",
  },
];

export function ReportsClient({
  accounts,
  workspaceName,
}: {
  accounts: AccountWithMeta[];
  workspaceName: string;
}) {
  const { dateRange, setDateRange, hideBalances } = useApp();
  const [accountId, setAccountId] = React.useState("all");
  const [selectedReport, setSelectedReport] = React.useState<ReportId>("monthly");
  const [exportMessage, setExportMessage] = React.useState<string | null>(null);

  async function handleExport(format: "pdf" | "csv" | "excel") {
    const report = reports.find((r) => r.id === selectedReport);
    const filters = {
      dateRange,
      accountId: accountId === "all" ? undefined : accountId,
      reportType: selectedReport,
    };
    try {
      if (format === "csv") {
        const result = await exportMonthlyCsvAction(filters);
        downloadCsv(result.filename, result.headers, result.rows);
      } else if (format === "excel") {
        const result = await exportMonthlyCsvAction(filters);
        await downloadExcel(
          `${workspaceName}-${selectedReport}-report.xlsx`,
          report?.title ?? "Report",
          result.headers,
          result.rows
        );
      } else {
        await downloadPdf(`${workspaceName}-report.pdf`, report?.title ?? "Report", [
          `${workspaceName} financial report`,
          `Period: ${dateRange}`,
          `Account: ${accountId === "all" ? "All accounts" : accountId}`,
          `Generated: ${new Date().toLocaleString()}`,
        ]);
      }
      setExportMessage(`${report?.title ?? "Report"} exported as ${format.toUpperCase()}`);
    } catch {
      setExportMessage("Export failed. Try again.");
    }
    window.setTimeout(() => setExportMessage(null), 3200);
  }

  async function handleBackup() {
    const result = await exportWorkspaceBackupAction({
      dateRange,
      accountId: accountId === "all" ? undefined : accountId,
      reportType: selectedReport,
    });
    downloadJson(result.filename, JSON.parse(result.content));
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Reports"
        description={`Generate financial summaries for ${formatMonthYear()}. Filters apply to every export.`}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Choose the period and account scope before exporting.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="report-range">Date range</Label>
              <Select
                value={dateRange}
                onValueChange={(v) =>
                  setDateRange(
                    v as
                      | "this_month"
                      | "last_month"
                      | "last_3_months"
                      | "year_to_date"
                      | "custom"
                  )
                }
              >
                <SelectTrigger id="report-range">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">This month</SelectItem>
                  <SelectItem value="last_month">Last month</SelectItem>
                  <SelectItem value="last_3_months">Last 3 months</SelectItem>
                  <SelectItem value="year_to_date">Year to date</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-account">Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="report-account">
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Export</Label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
                  <FileDown className="h-3.5 w-3.5" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport("excel")}>
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Excel
                </Button>
              </div>
            </div>
          </div>
          {exportMessage ? (
            <p className="mt-4 rounded-[8px] bg-success-muted px-3 py-2 text-sm text-success">
              {exportMessage}
              {hideBalances ? " · Balances remain hidden in preview mode." : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="mb-6 flex justify-end">
        <Button variant="outline" onClick={() => void handleBackup()}>
          Backup workspace JSON
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon;
          const active = selectedReport === report.id;
          return (
            <button
              key={report.id}
              type="button"
              onClick={() => setSelectedReport(report.id)}
              className={cn(
                "rounded-[12px] border bg-card p-5 text-left shadow-[var(--shadow-sm)] transition-colors",
                active
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:bg-muted/40"
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="rounded-[8px] bg-muted p-2 text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <Badge variant={active ? "default" : "secondary"}>{report.period}</Badge>
              </div>
              <h3 className="text-base font-semibold">{report.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{report.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={active ? "default" : "outline"}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedReport(report.id);
                    handleExport("pdf");
                  }}
                >
                  Export PDF
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedReport(report.id);
                    handleExport("csv");
                  }}
                >
                  CSV
                </Button>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
