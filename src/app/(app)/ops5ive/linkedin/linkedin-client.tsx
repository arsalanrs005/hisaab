"use client";

import { useMemo, useState } from "react";
import {
  Search,
  UserPlus,
  MessageCircle,
  Phone,
  FileText,
  Trophy,
  CalendarClock,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { LinkedInProspectDialog } from "@/components/forms/linkedin-prospect-dialog";
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
import type { ChartPoint, LinkedInActivity } from "@/types";

interface LinkedInClientProps {
  linkedInActivities: LinkedInActivity[];
}

function statusVariant(
  status: LinkedInActivity["status"]
): "default" | "secondary" | "success" | "warning" | "danger" | "outline" {
  switch (status) {
    case "won":
      return "success";
    case "call":
    case "proposal":
      return "default";
    case "conversation":
    case "accepted":
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
  icon: typeof Search;
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

function SalesTargetCalculator() {
  const [revenue, setRevenue] = useState("600000");
  const [avgValue, setAvgValue] = useState("280000");
  const [winRate, setWinRate] = useState("15");
  const [leadToConvo, setLeadToConvo] = useState("28");
  const [convoToCall, setConvoToCall] = useState("35");
  const [callToClient, setCallToClient] = useState("40");
  const [acceptRate, setAcceptRate] = useState("40");
  const [weeks, setWeeks] = useState("4");

  const result = useMemo(() => {
    const desired = Number(revenue) || 0;
    const avg = Number(avgValue) || 1;
    const win = (Number(winRate) || 1) / 100;
    const accept = (Number(acceptRate) || 1) / 100;
    const l2c = (Number(leadToConvo) || 1) / 100;
    const c2call = (Number(convoToCall) || 1) / 100;
    const call2client = (Number(callToClient) || 1) / 100;
    const w = Number(weeks) || 1;
    const clientsNeeded = desired / avg;
    const proposalsNeeded = clientsNeeded / win;
    const callsNeeded = proposalsNeeded / call2client;
    const conversationsNeeded = callsNeeded / c2call;
    const acceptsNeeded = conversationsNeeded / l2c;
    const requestsNeeded = acceptsNeeded / accept;
    const weeklyOutreach = requestsNeeded / w;
    return {
      clientsNeeded,
      proposalsNeeded,
      callsNeeded,
      conversationsNeeded,
      requestsNeeded,
      weeklyOutreach,
    };
  }, [revenue, avgValue, winRate, acceptRate, leadToConvo, convoToCall, callToClient, weeks]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales target calculator</CardTitle>
        <CardDescription>
          Map LinkedIn outreach volume to a monthly revenue goal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Desired monthly revenue (PKR)</Label>
            <Input value={revenue} onChange={(e) => setRevenue(e.target.value)} className="tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label>Average deal value (PKR)</Label>
            <Input value={avgValue} onChange={(e) => setAvgValue(e.target.value)} className="tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label>Proposal → win %</Label>
            <Input value={winRate} onChange={(e) => setWinRate(e.target.value)} className="tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label>Accept → conversation %</Label>
            <Input value={leadToConvo} onChange={(e) => setLeadToConvo(e.target.value)} className="tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label>Conversation → call %</Label>
            <Input value={convoToCall} onChange={(e) => setConvoToCall(e.target.value)} className="tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label>Call → proposal %</Label>
            <Input value={callToClient} onChange={(e) => setCallToClient(e.target.value)} className="tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label>Request → accept %</Label>
            <Input value={acceptRate} onChange={(e) => setAcceptRate(e.target.value)} className="tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label>Working weeks / month</Label>
            <Input value={weeks} onChange={(e) => setWeeks(e.target.value)} className="tabular-nums" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Clients needed", result.clientsNeeded.toFixed(1)],
            ["Proposals", result.proposalsNeeded.toFixed(1)],
            ["Calls", result.callsNeeded.toFixed(1)],
            ["Conversations", result.conversationsNeeded.toFixed(1)],
            ["Weekly requests", result.weeklyOutreach.toFixed(1)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[10px] border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-[10px] border border-dashed border-border bg-muted/20 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">Formula</p>
          <pre className="whitespace-pre-wrap font-sans">{`clients = desired ÷ avg_deal
connection_requests = clients ÷ (accept × reply × call × win rates)
weekly = requests ÷ working_weeks

Example: ${formatPKR(Number(revenue) || 0)} ÷ ${formatPKR(Number(avgValue) || 0)} → ${result.weeklyOutreach.toFixed(1)} requests/week`}</pre>
        </div>
      </CardContent>
    </Card>
  );
}

export function LinkedInClient({ linkedInActivities }: LinkedInClientProps) {
  const { hideBalances } = useApp();
  const [prospectOpen, setProspectOpen] = useState(false);
  const count = (statuses: LinkedInActivity["status"][]) =>
    linkedInActivities.filter((a) => statuses.includes(a.status)).length;

  const researched = linkedInActivities.length;
  const requested = count(["requested", "accepted", "conversation", "call", "proposal", "won"]);
  const accepted = count(["accepted", "conversation", "call", "proposal", "won"]);
  const conversations = count(["conversation", "call", "proposal", "won"]);
  const calls = count(["call", "proposal", "won"]);
  const proposals = count(["proposal", "won"]);
  const won = count(["won"]);
  const revenue = linkedInActivities.reduce((s, a) => s + (a.revenue ?? 0), 0);
  const followUps = linkedInActivities
    .filter((a) => a.followUpDate)
    .sort((a, b) => (a.followUpDate ?? "").localeCompare(b.followUpDate ?? ""));

  const weeklyTarget = 25;
  const weekRequests = linkedInActivities.filter(
    (a) =>
      a.date >= "2026-07-18" &&
      ["requested", "accepted", "conversation", "call", "proposal", "won"].includes(a.status)
  ).length;
  const weeklyPct = Math.min(100, Math.round((weekRequests / weeklyTarget) * 100));

  const funnel: ChartPoint[] = [
    { label: "Prospects", value: researched },
    { label: "Requested", value: requested },
    { label: "Accepted", value: accepted },
    { label: "Talks", value: conversations },
    { label: "Calls", value: calls },
    { label: "Won", value: won },
  ];

  const weekly: ChartPoint[] = [
    { label: "W1", value: 8 },
    { label: "W2", value: 12 },
    { label: "W3", value: 15 },
    { label: "W4", value: 10 },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="LinkedIn"
        description="Outreach funnel, follow-ups, and reverse sales planning."
      >
        <Button variant="outline" onClick={() => setProspectOpen(true)}>
          Add prospect
        </Button>
      </PageHeader>

      <LinkedInProspectDialog open={prospectOpen} onOpenChange={setProspectOpen} />

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CountMetric title="Prospects" value={formatNumber(researched)} icon={Search} />
        <CountMetric title="Requests" value={formatNumber(requested)} icon={UserPlus} />
        <CountMetric title="Conversations" value={formatNumber(conversations)} icon={MessageCircle} />
        <CountMetric title="Calls" value={formatNumber(calls)} icon={Phone} />
        <CountMetric title="Proposals" value={formatNumber(proposals)} icon={FileText} />
        <CountMetric title="Won" value={formatNumber(won)} icon={Trophy} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue from LI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CurrencyAmount amount={revenue} hidden={hideBalances} size="lg" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Weekly request target
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {weekRequests}/{weeklyTarget}
            </p>
            <Progress value={weeklyPct} className="mt-3" />
          </CardContent>
        </Card>
      </section>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Outreach funnel" description="Status progression">
          <CashFlowChart data={funnel} />
        </ChartCard>
        <ChartCard title="Weekly activity" description="Connection actions per week">
          <TrendLineChart data={weekly} />
        </ChartCard>
      </div>

      <section className="mb-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Prospects</CardTitle>
            <CardDescription>All LinkedIn activities in the mock workspace.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Prospect</th>
                  <th className="pb-2 font-medium">Company</th>
                  <th className="pb-2 font-medium">Title</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {linkedInActivities.map((a) => (
                  <tr key={a.id} className="border-b border-border/70 last:border-0">
                    <td className="py-3 font-medium">{a.prospectName}</td>
                    <td className="py-3 text-muted-foreground">{a.company}</td>
                    <td className="py-3 text-muted-foreground">{a.title}</td>
                    <td className="py-3">
                      <Badge variant={statusVariant(a.status)} className="capitalize">
                        {a.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-muted-foreground">{formatDate(a.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              Follow-up queue
            </CardTitle>
            <CardDescription>Items with a scheduled follow-up date.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {followUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No follow-ups scheduled.</p>
            ) : (
              followUps.map((a) => (
                <div
                  key={a.id}
                  className="rounded-[10px] border border-border bg-muted/30 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{a.prospectName}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.company} · {a.title}
                      </p>
                    </div>
                    <Badge variant={statusVariant(a.status)} className="capitalize">
                      {a.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs font-medium text-primary">
                    Follow up {formatDate(a.followUpDate!)}
                  </p>
                  {a.notes ? (
                    <p className="mt-1 text-xs text-muted-foreground">{a.notes}</p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <SalesTargetCalculator />
    </div>
  );
}
