"use client";

import * as React from "react";
import Link from "next/link";
import {
  Briefcase,
  TrendingUp,
  Wallet,
  Receipt,
  Users,
  PiggyBank,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/finance/metric-card";
import { CurrencyAmount } from "@/components/finance/currency-amount";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { formatPercent } from "@/lib/format";
import { useApp } from "@/providers/app-provider";
import { cn } from "@/lib/utils";
import type { BusinessClient } from "@/types";

type OpsMetrics = {
  monthlyRecurring: number;
  projectRevenue: number;
  expectedIncome: number;
  receivedIncome: number;
  expenses: number;
  employeePayments: number;
  netProfit: number;
  businessReserve: number;
  reinvestment: number;
};

interface Ops5iveClientProps {
  initialMetrics: OpsMetrics;
  clients: BusinessClient[];
}

export function Ops5iveClient({ initialMetrics, clients }: Ops5iveClientProps) {
  const { hideBalances } = useApp();
  const [metrics, setMetrics] = React.useState(initialMetrics);

  const growthTargets = [
    { label: "Monthly revenue", current: metrics.receivedIncome, target: 1800000 },
    { label: "MRR", current: metrics.monthlyRecurring, target: 500000 },
    { label: "Business reserve", current: metrics.businessReserve, target: 800000 },
  ];

  function updateField(key: keyof OpsMetrics, raw: string) {
    const value = Number(raw.replace(/,/g, ""));
    if (Number.isNaN(value)) return;
    setMetrics((prev) => {
      const next = { ...prev, [key]: value };
      next.netProfit = next.receivedIncome - next.expenses;
      next.reinvestment = Math.round(next.netProfit * 0.2);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Ops5ive"
        description="Business dashboard for retainers, projects, costs, and reinvestment."
      >
        <Button variant="outline" asChild>
          <Link href="/ops5ive/upwork">Upwork</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/ops5ive/linkedin">LinkedIn</Link>
        </Button>
      </PageHeader>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="MRR" amount={metrics.monthlyRecurring} hidden={hideBalances} icon={RefreshCw} changeLabel="Active retainers" changeTone="positive" />
        <MetricCard title="Project revenue" amount={metrics.projectRevenue} hidden={hideBalances} icon={Briefcase} />
        <MetricCard title="Expected income" amount={metrics.expectedIncome} hidden={hideBalances} icon={TrendingUp} changeLabel="Includes uncleared" changeTone="neutral" />
        <MetricCard title="Received income" amount={metrics.receivedIncome} hidden={hideBalances} icon={Wallet} changeLabel="Cleared this month" changeTone="positive" />
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Expenses" amount={metrics.expenses} hidden={hideBalances} icon={Receipt} />
        <MetricCard title="Employee payments" amount={metrics.employeePayments} hidden={hideBalances} icon={Users} />
        <MetricCard title="Net profit" amount={metrics.netProfit} hidden={hideBalances} icon={TrendingUp} changeTone={metrics.netProfit >= 0 ? "positive" : "negative"} />
        <MetricCard title="Business reserve" amount={metrics.businessReserve} hidden={hideBalances} icon={PiggyBank} changeLabel={`Reinvest ~${hideBalances ? "••••" : formatPercent(20)} of net`} changeTone="neutral" />
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue by client</CardTitle>
            <CardDescription>Retainers, projects, expected and received amounts.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No business clients yet.</p>
            ) : (
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Client</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium text-right">Retainer</th>
                    <th className="pb-2 font-medium text-right">Project</th>
                    <th className="pb-2 font-medium text-right">Expected</th>
                    <th className="pb-2 font-medium text-right">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-b border-border/70 last:border-0">
                      <td className="py-3 font-medium">{client.name}</td>
                      <td className="py-3">
                        <Badge variant={client.status === "active" ? "success" : client.status === "pipeline" ? "warning" : "secondary"} className="capitalize">
                          {client.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right"><CurrencyAmount amount={client.monthlyRetainer} hidden={hideBalances} size="sm" /></td>
                      <td className="py-3 text-right"><CurrencyAmount amount={client.projectRevenue} hidden={hideBalances} size="sm" /></td>
                      <td className="py-3 text-right"><CurrencyAmount amount={client.expectedIncome} hidden={hideBalances} size="sm" /></td>
                      <td className="py-3 text-right"><CurrencyAmount amount={client.receivedIncome} hidden={hideBalances} size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline</CardTitle>
            <CardDescription>Current stage per client.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {clients.map((client) => (
              <div key={client.id} className="rounded-[10px] border border-border bg-muted/30 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{client.name}</p>
                  <Badge variant="outline" className="capitalize">{client.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{client.pipelineStage}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Growth targets</CardTitle>
            <CardDescription>Q3 targets versus current figures.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {growthTargets.map((t) => {
              const pct = t.target === 0 ? 0 : Math.min(100, Math.round((t.current / t.target) * 100));
              return (
                <div key={t.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium">{t.label}</span>
                    <span className="tabular-nums text-muted-foreground">{pct}%</span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scenario snapshot</CardTitle>
            <CardDescription>Adjust values to model scenarios locally.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["monthlyRecurring", "MRR"],
                ["receivedIncome", "Received income"],
                ["expenses", "Expenses"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key}>{label}</Label>
                <Input id={key} type="number" value={metrics[key]} onChange={(e) => updateField(key, e.target.value)} className="tabular-nums" />
              </div>
            ))}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Derived net profit</Label>
              <div className={cn("rounded-[8px] border border-border bg-muted/40 px-3 py-2.5 text-sm font-semibold", metrics.netProfit >= 0 ? "text-success" : "text-danger")}>
                <CurrencyAmount amount={metrics.netProfit} hidden={hideBalances} size="md" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
