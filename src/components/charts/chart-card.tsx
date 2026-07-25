"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CategorySpend, ChartPoint } from "@/types";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function ChartCard({
  title,
  description,
  children,
  className,
  action,
}: ChartCardProps) {
  return (
    <Card className={cn("min-w-0 border-[var(--glass-border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] backdrop-blur-[var(--glass-blur)]", className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-5 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description ? (
            <p className="mt-1 text-xs text-foreground-muted">{description}</p>
          ) : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="h-[240px] px-5 pb-5 pt-2">{children}</CardContent>
    </Card>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[8px] border border-border bg-card px-3 py-2 text-xs shadow-[var(--shadow-md)]">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-muted-foreground">
          {p.name}: <span className="font-medium text-foreground tabular-nums">{formatCompact(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function IncomeExpenseChart({ data }: { data: ChartPoint[] }) {
  const chartData = data.map((d) => ({
    label: d.label,
    Income: d.value,
    Expenses: d.secondary ?? 0,
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompact(v).replace("PKR ", "")} width={48} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="Income" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="Expenses" fill="var(--chart-4)" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SavingsGrowthChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="savingsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompact(v).replace("PKR ", "")} width={48} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="value" name="Savings" stroke="var(--chart-2)" fill="url(#savingsFill)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SpendingCategoryChart({ data }: { data: CategorySpend[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="category"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell key={entry.category} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CashFlowChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompact(v).replace("PKR ", "")} width={48} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="value" name="Cash flow" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.value >= 0 ? "var(--chart-1)" : "var(--chart-5)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GoalAllocationChart({ data }: { data: CategorySpend[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompact(v).replace("PKR ", "")} />
        <YAxis type="category" dataKey="category" width={72} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="amount" name="Allocation" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {data.map((entry) => (
            <Cell key={entry.category} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompact(v).replace("PKR ", "")} width={48} />
        <Tooltip content={<ChartTooltip />} />
        <Line type="monotone" dataKey="value" name="Balance" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
