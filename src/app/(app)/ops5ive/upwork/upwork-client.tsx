"use client";

import { useMemo, useState } from "react";
import {
  Send,
  MessageSquare,
  Users,
  Handshake,
  Trophy,
  Coins,
  Percent,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { UpworkLogDialog } from "@/components/forms/upwork-log-dialog";
import { CurrencyAmount } from "@/components/finance/currency-amount";
import { ChartCard, CashFlowChart, TrendLineChart } from "@/components/charts/chart-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/providers/app-provider";
import { formatDate, formatNumber, formatPercent, formatPKR } from "@/lib/format";
import type { ChartPoint, UpworkActivity } from "@/types";

interface UpworkClientProps {
  upworkActivities: UpworkActivity[];
}

function statusVariant(
  status: UpworkActivity["status"]
): "default" | "secondary" | "success" | "warning" | "danger" | "outline" {
  switch (status) {
    case "won":
      return "success";
    case "offer":
      return "default";
    case "interview":
      return "warning";
    case "lost":
      return "danger";
    default:
      return "secondary";
  }
}

function CountMetric({
  title,
  value,
  icon: Icon,
  hint,
}: {
  title: string;
  value: string;
  icon: typeof Send;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="rounded-[8px] bg-muted p-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function GrowthCalculator() {
  const [revenue, setRevenue] = useState("800000");
  const [avgValue, setAvgValue] = useState("200000");
  const [closeRate, setCloseRate] = useState("20");
  const [leadToConvo, setLeadToConvo] = useState("25");
  const [convoToCall, setConvoToCall] = useState("40");
  const [callToClient, setCallToClient] = useState("30");
  const [weeks, setWeeks] = useState("4");

  const result = useMemo(() => {
    const desired = Number(revenue) || 0;
    const avg = Number(avgValue) || 1;
    const win = (Number(closeRate) || 1) / 100;
    const l2c = (Number(leadToConvo) || 1) / 100;
    const c2call = (Number(convoToCall) || 1) / 100;
    const call2client = (Number(callToClient) || 1) / 100;
    const w = Number(weeks) || 1;
    const clientsNeeded = desired / avg;
    const proposalsNeeded = clientsNeeded / win;
    const callsNeeded = clientsNeeded / call2client;
    const conversationsNeeded = callsNeeded / c2call;
    const prospectsNeeded = conversationsNeeded / l2c;
    const weeklyOutreach = prospectsNeeded / w;
    return {
      clientsNeeded,
      proposalsNeeded,
      callsNeeded,
      conversationsNeeded,
      prospectsNeeded,
      weeklyOutreach,
    };
  }, [revenue, avgValue, closeRate, leadToConvo, convoToCall, callToClient, weeks]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Growth calculator</CardTitle>
        <CardDescription>
          Reverse-engineer weekly Upwork outreach from a monthly revenue target.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="uw-rev">Desired monthly revenue (PKR)</Label>
            <Input id="uw-rev" value={revenue} onChange={(e) => setRevenue(e.target.value)} className="tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uw-avg">Average client value (PKR)</Label>
            <Input id="uw-avg" value={avgValue} onChange={(e) => setAvgValue(e.target.value)} className="tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uw-win">Proposal → win %</Label>
            <Input id="uw-win" value={closeRate} onChange={(e) => setCloseRate(e.target.value)} className="tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uw-l2c">Prospect → conversation %</Label>
            <Input id="uw-l2c" value={leadToConvo} onChange={(e) => setLeadToConvo(e.target.value)} className="tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uw-c2c">Conversation → call %</Label>
            <Input id="uw-c2c" value={convoToCall} onChange={(e) => setConvoToCall(e.target.value)} className="tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uw-call">Call → client %</Label>
            <Input id="uw-call" value={callToClient} onChange={(e) => setCallToClient(e.target.value)} className="tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uw-weeks">Working weeks / month</Label>
            <Input id="uw-weeks" value={weeks} onChange={(e) => setWeeks(e.target.value)} className="tabular-nums" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Clients needed", result.clientsNeeded.toFixed(1)],
            ["Proposals needed", result.proposalsNeeded.toFixed(1)],
            ["Calls needed", result.callsNeeded.toFixed(1)],
            ["Conversations", result.conversationsNeeded.toFixed(1)],
            ["Weekly outreach", result.weeklyOutreach.toFixed(1)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[10px] border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-[10px] border border-dashed border-border bg-muted/20 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">Formula</p>
          <pre className="whitespace-pre-wrap font-sans">{`clients = desired_revenue ÷ avg_client_value
proposals = clients ÷ win_rate
calls = clients ÷ call_to_client_rate
conversations = calls ÷ conversation_to_call_rate
prospects = conversations ÷ prospect_to_conversation_rate
weekly = prospects ÷ working_weeks

Example: ${formatPKR(Number(revenue) || 0)} ÷ ${formatPKR(Number(avgValue) || 0)} → ${result.weeklyOutreach.toFixed(1)} prospects/week`}</pre>
        </div>
      </CardContent>
    </Card>
  );
}

export function UpworkClient({ upworkActivities }: UpworkClientProps) {
  const { hideBalances } = useApp();
  const [logOpen, setLogOpen] = useState(false);
  const sent = upworkActivities.length;
  const responded = upworkActivities.filter((a) =>
    ["responded", "interview", "offer", "won"].includes(a.status)
  ).length;
  const interviews = upworkActivities.filter((a) =>
    ["interview", "offer", "won"].includes(a.status)
  ).length;
  const offers = upworkActivities.filter((a) => ["offer", "won"].includes(a.status)).length;
  const won = upworkActivities.filter((a) => a.status === "won").length;
  const connects = upworkActivities.reduce((s, a) => s + a.connectsSpent, 0);
  const revenue = upworkActivities.reduce((s, a) => s + (a.revenue ?? 0), 0);
  const avgProject = won > 0 ? Math.round(revenue / won) : 0;
  const conversion = sent > 0 ? (won / sent) * 100 : 0;
  const weeklyTarget = 12;
  const weeklySent = upworkActivities.filter((a) => a.date >= "2026-07-18").length;
  const weeklyPct = Math.min(100, Math.round((weeklySent / weeklyTarget) * 100));

  const funnel: ChartPoint[] = [
    { label: "Sent", value: sent },
    { label: "Responses", value: responded },
    { label: "Interviews", value: interviews },
    { label: "Offers", value: offers },
    { label: "Won", value: won },
  ];

  const activityTrend: ChartPoint[] = [
    { label: "W1", value: 2 },
    { label: "W2", value: 4 },
    { label: "W3", value: 3 },
    { label: "W4", value: 5 },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Upwork"
        description="Sales activity, proposal pipeline, and reverse growth planning."
      >
        <Button variant="outline" onClick={() => setLogOpen(true)}>
          Log proposal
        </Button>
      </PageHeader>

      <UpworkLogDialog open={logOpen} onOpenChange={setLogOpen} />

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CountMetric title="Proposals" value={formatNumber(sent)} icon={Send} />
        <CountMetric title="Responses" value={formatNumber(responded)} icon={MessageSquare} />
        <CountMetric title="Interviews" value={formatNumber(interviews)} icon={Users} />
        <CountMetric title="Offers" value={formatNumber(offers)} icon={Handshake} />
        <CountMetric title="Won" value={formatNumber(won)} icon={Trophy} />
        <CountMetric title="Connects spent" value={formatNumber(connects)} icon={Coins} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue won
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CurrencyAmount amount={revenue} hidden={hideBalances} size="lg" />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Avg project{" "}
              {hideBalances ? "••••" : formatPKR(avgProject)}
            </p>
          </CardContent>
        </Card>
        <CountMetric
          title="Conversion"
          value={formatPercent(conversion)}
          icon={Percent}
          hint="Won ÷ proposals"
        />
      </section>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Sales funnel" description="Proposal pipeline counts">
          <CashFlowChart data={funnel} />
        </ChartCard>
        <ChartCard title="Activity trend" description="Proposals sent per week">
          <TrendLineChart data={activityTrend} />
        </ChartCard>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Weekly proposal target</CardTitle>
              <CardDescription>
                {weeklySent} of {weeklyTarget} proposals this week
              </CardDescription>
            </div>
            <span className="text-sm font-semibold tabular-nums">{weeklyPct}%</span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={weeklyPct} />
        </CardContent>
      </Card>

      <section className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Proposals</CardTitle>
            <CardDescription>Recent Upwork activity from mock data.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Title</th>
                  <th className="pb-2 font-medium">Client</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium text-right">Bid</th>
                  <th className="pb-2 font-medium text-right">Connects</th>
                  <th className="pb-2 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {upworkActivities.map((a) => (
                  <tr key={a.id} className="border-b border-border/70 last:border-0">
                    <td className="py-3 font-medium">{a.title}</td>
                    <td className="py-3 text-muted-foreground">{a.client}</td>
                    <td className="py-3">
                      <Badge variant={statusVariant(a.status)} className="capitalize">
                        {a.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-muted-foreground">{formatDate(a.date)}</td>
                    <td className="py-3 text-right tabular-nums">${a.bidAmount}</td>
                    <td className="py-3 text-right tabular-nums">{a.connectsSpent}</td>
                    <td className="py-3 text-right">
                      {a.revenue != null ? (
                        <CurrencyAmount amount={a.revenue} hidden={hideBalances} size="sm" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      <GrowthCalculator />
    </div>
  );
}
