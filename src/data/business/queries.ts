import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import { requireCurrentWorkspace } from "@/data/workspaces/queries";
import { parseMoney } from "@/lib/money";
import type {
  BusinessClient,
  BusinessExpense,
  BusinessIncome,
  LinkedInActivity,
  UpworkActivity,
} from "@/types";

export const dynamic = "force-dynamic";

type DbClient = {
  id: string;
  name: string;
  status: string;
  expected_monthly_value: number | null;
  notes: string | null;
  workspace_id: string;
};

type DbIncome = {
  id: string;
  client_id: string | null;
  expected_amount: number | null;
  received_amount: number | null;
  expected_date: string | null;
  received_date: string | null;
  status: string;
  notes: string | null;
  workspace_id: string;
};

type DbExpense = {
  id: string;
  name: string;
  amount_pkr: number;
  expense_date: string;
  category_id: string | null;
  recurring: boolean;
  workspace_id: string;
};

async function workspaceClient() {
  await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const supabase = await createClient();
  return { supabase, workspaceId: workspace.workspaceId };
}

function mapClientToUi(client: DbClient, incomes: DbIncome[]): BusinessClient {
  const clientIncomes = incomes.filter((i) => i.client_id === client.id);
  const received = clientIncomes.reduce((s, i) => s + parseMoney(i.received_amount ?? 0), 0);
  const expected = clientIncomes.reduce((s, i) => s + parseMoney(i.expected_amount ?? 0), 0);

  return {
    id: client.id,
    name: client.name,
    status: (client.status as BusinessClient["status"]) ?? "active",
    monthlyRetainer: parseMoney(client.expected_monthly_value ?? 0),
    projectRevenue: received,
    expectedIncome: expected,
    receivedIncome: received,
    pipelineStage: client.notes ?? client.status,
  };
}


export async function getBusinessClients(): Promise<BusinessClient[]> {
  const { supabase, workspaceId } = await workspaceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const incomesRes = await (supabase as any)
    .from("business_income")
    .select("*")
    .eq("workspace_id", workspaceId);
  const incomes = (incomesRes.data ?? []) as DbIncome[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("business_clients")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("name");

  if (error) throw new Error("Unable to load business clients.");
  return ((data ?? []) as unknown as DbClient[]).map((row) => mapClientToUi(row, incomes));
}

export async function getBusinessIncomes(): Promise<BusinessIncome[]> {
  const { supabase, workspaceId } = await workspaceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("business_income")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("expected_date", { ascending: false });

  if (error) throw new Error("Unable to load business income.");

  return ((data ?? []) as unknown as DbIncome[]).map((row) => ({
    id: row.id,
    clientId: row.client_id ?? "",
    amount: parseMoney(row.received_amount ?? row.expected_amount ?? 0),
    date: row.received_date ?? row.expected_date ?? "",
    type: row.status === "expected" ? "expected" : row.received_amount ? "project" : "retainer",
    received: row.status === "received",
    note: row.notes ?? undefined,
  }));
}

export async function getBusinessExpenses(): Promise<BusinessExpense[]> {
  const { supabase, workspaceId } = await workspaceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("business_expenses")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("expense_date", { ascending: false });

  if (error) throw new Error("Unable to load business expenses.");

  return ((data ?? []) as unknown as DbExpense[]).map((row) => ({
    id: row.id,
    name: row.name,
    amount: parseMoney(row.amount_pkr),
    date: row.expense_date,
    category: row.category_id ?? "",
    recurring: row.recurring,
    isEmployeePayment:
      row.name.toLowerCase().includes("employee") || row.name.toLowerCase().includes("payroll"),
  }));
}

export async function getOps5iveMetrics() {
  const { supabase, workspaceId } = await workspaceClient();
  const [clients, incomes, expenseItems] = await Promise.all([
    getBusinessClients(),
    getBusinessIncomes(),
    getBusinessExpenses(),
  ]);

  const monthlyRecurring = clients.reduce((s, c) => s + c.monthlyRetainer, 0);
  const projectRevenue = clients.reduce((s, c) => s + c.projectRevenue, 0);
  const expectedIncome = clients.reduce((s, c) => s + c.expectedIncome, 0);
  const receivedIncome = clients.reduce((s, c) => s + c.receivedIncome, 0);
  const expenses = expenseItems.reduce((s, e) => s + e.amount, 0);
  const employeePayments = expenseItems
    .filter((e) => e.isEmployeePayment)
    .reduce((s, e) => s + e.amount, 0);
  const netProfit = receivedIncome - expenses;
  const reinvestment = Math.round(Math.max(netProfit, 0) * 0.2);

  const today = new Date().toISOString().slice(0, 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: reserveTarget } = await (supabase as any)
    .from("business_targets")
    .select("target_value, assumptions")
    .eq("workspace_id", workspaceId)
    .eq("metric", "business_reserve")
    .lte("period_start", today)
    .gte("period_end", today)
    .maybeSingle();

  let businessReserve = 0;
  if (reserveTarget?.assumptions?.current_balance != null) {
    businessReserve = parseMoney(reserveTarget.assumptions.current_balance);
  } else if (reserveTarget?.target_value != null) {
    businessReserve = parseMoney(reserveTarget.target_value);
  } else {
    businessReserve = Math.max(0, receivedIncome - expenses - reinvestment);
  }

  return {
    clients,
    incomes,
    expenseItems,
    monthlyRecurring,
    projectRevenue,
    expectedIncome,
    receivedIncome,
    expenses,
    employeePayments,
    netProfit,
    businessReserve,
    reinvestment,
  };
}

export async function getUpworkOpportunities(): Promise<UpworkActivity[]> {
  const { supabase, workspaceId } = await workspaceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("upwork_opportunities")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("activity_date", { ascending: false });

  if (!error && (data?.length ?? 0) > 0) {
    return (data as Array<{
      id: string;
      title: string;
      client_name: string;
      status: UpworkActivity["status"];
      connects_spent: number;
      bid_amount: number;
      activity_date: string;
      follow_up_date: string | null;
      revenue: number | null;
    }>).map((row) => ({
      id: row.id,
      title: row.title,
      client: row.client_name,
      status: row.status,
      connectsSpent: row.connects_spent ?? 0,
      bidAmount: parseMoney(row.bid_amount ?? 0),
      date: row.activity_date,
      followUpDate: row.follow_up_date ?? undefined,
      revenue: row.revenue != null ? parseMoney(row.revenue) : undefined,
    }));
  }

  // Fallback to legacy aggregate activity table when Phase 7 rows are empty.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: legacy } = await (supabase as any)
    .from("upwork_activities")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("activity_date", { ascending: false });

  return ((legacy ?? []) as Array<{
    id: string;
    activity_date: string;
    proposals_sent: number;
    connects_spent: number;
    projects_won: number;
    revenue_generated: number;
  }>).map((row) => ({
    id: row.id,
    title: `${row.proposals_sent} proposals · ${row.activity_date}`,
    client: "Upwork activity",
    status: row.projects_won > 0 ? "won" : "sent",
    connectsSpent: row.connects_spent ?? 0,
    bidAmount: 0,
    date: row.activity_date,
    revenue: parseMoney(row.revenue_generated ?? 0),
  }));
}

export async function getLinkedInProspects(): Promise<LinkedInActivity[]> {
  const { supabase, workspaceId } = await workspaceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("linkedin_prospects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("activity_date", { ascending: false });

  if (!error && (data?.length ?? 0) > 0) {
    return (data as Array<{
      id: string;
      prospect_name: string;
      company: string;
      title: string;
      status: LinkedInActivity["status"];
      activity_date: string;
      follow_up_date: string | null;
      revenue: number | null;
      notes: string | null;
    }>).map((row) => ({
      id: row.id,
      prospectName: row.prospect_name,
      company: row.company,
      title: row.title,
      status: row.status,
      date: row.activity_date,
      followUpDate: row.follow_up_date ?? undefined,
      revenue: row.revenue != null ? parseMoney(row.revenue) : undefined,
      notes: row.notes ?? undefined,
    }));
  }

  // Fallback to legacy aggregate activity table when Phase 7 rows are empty.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: legacy } = await (supabase as any)
    .from("linkedin_activities")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("activity_date", { ascending: false });

  return ((legacy ?? []) as Array<{
    id: string;
    activity_date: string;
    conversations_started: number;
    clients_won: number;
    revenue_generated: number;
  }>).map((row) => ({
    id: row.id,
    prospectName: "Daily outreach",
    company: "LinkedIn",
    title: `${row.conversations_started ?? 0} conversations`,
    status: row.clients_won > 0 ? "won" : "researched",
    date: row.activity_date,
    revenue: parseMoney(row.revenue_generated ?? 0),
  }));
}

export async function getSalesPipeline() {
  const { supabase, workspaceId } = await workspaceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("sales_opportunities")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null);

  if (error) return [];
  return ((data ?? []) as Array<{
    id: string;
    title: string;
    stage: string;
    expected_amount: number;
    probability: number | null;
    expected_close_date: string | null;
    client_id: string | null;
  }>).map((row) => ({
    id: row.id,
    title: row.title,
    stage: row.stage,
    expectedAmount: parseMoney(row.expected_amount),
    probability: row.probability,
    expectedCloseDate: row.expected_close_date,
    clientId: row.client_id,
  }));
}
