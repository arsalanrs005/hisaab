"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import { requireCurrentWorkspace } from "@/data/workspaces/queries";
import { mapDatabaseError } from "@/data/errors";
import { parseMoney, toDbMoney } from "@/lib/money";
import {
  createBusinessExpenseSchema,
  createBusinessIncomeSchema,
  createLinkedInProspectSchema,
  createSalesOpportunitySchema,
  createUpworkOpportunitySchema,
  type CreateBusinessExpenseInput,
  type CreateBusinessIncomeInput,
  type CreateLinkedInProspectInput,
  type CreateSalesOpportunityInput,
  type CreateUpworkOpportunityInput,
} from "@/data/business/validation";

async function workspaceContext() {
  const profile = await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const supabase = await createClient();
  return { profile, workspace, supabase };
}

function revalidateOpsPaths() {
  revalidatePath("/ops5ive");
  revalidatePath("/ops5ive/upwork");
  revalidatePath("/ops5ive/linkedin");
  revalidatePath("/reports");
}

export async function createUpworkOpportunityAction(raw: CreateUpworkOpportunityInput) {
  const { profile, workspace, supabase } = await workspaceContext();
  const input = createUpworkOpportunitySchema.parse(raw);

  const { data, error } = await (supabase as any)
    .from("upwork_opportunities")
    .insert({
      workspace_id: workspace.workspaceId,
      title: input.title,
      client_name: input.clientName,
      status: input.status,
      connects_spent: input.connectsSpent,
      bid_amount: toDbMoney(parseMoney(input.bidAmount ?? "0")),
      activity_date: input.activityDate ?? new Date().toISOString().slice(0, 10),
      follow_up_date: input.followUpDate ?? null,
      revenue: input.revenue ? toDbMoney(parseMoney(input.revenue)) : null,
      notes: input.notes ?? null,
      created_by: profile.id,
      updated_by: profile.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  revalidateOpsPaths();
  return { ok: true as const, id: data.id };
}

export async function createLinkedInProspectAction(raw: CreateLinkedInProspectInput) {
  const { profile, workspace, supabase } = await workspaceContext();
  const input = createLinkedInProspectSchema.parse(raw);

  const { data, error } = await (supabase as any)
    .from("linkedin_prospects")
    .insert({
      workspace_id: workspace.workspaceId,
      prospect_name: input.prospectName,
      company: input.company,
      title: input.title,
      status: input.status,
      activity_date: input.activityDate ?? new Date().toISOString().slice(0, 10),
      follow_up_date: input.followUpDate ?? null,
      revenue: input.revenue ? toDbMoney(parseMoney(input.revenue)) : null,
      notes: input.notes ?? null,
      created_by: profile.id,
      updated_by: profile.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  revalidateOpsPaths();
  return { ok: true as const, id: data.id };
}

export async function createSalesOpportunityAction(raw: CreateSalesOpportunityInput) {
  const { profile, workspace, supabase } = await workspaceContext();
  const input = createSalesOpportunitySchema.parse(raw);

  const { data, error } = await (supabase as any)
    .from("sales_opportunities")
    .insert({
      workspace_id: workspace.workspaceId,
      title: input.title,
      stage: input.stage,
      expected_amount: toDbMoney(parseMoney(input.expectedAmount ?? "0")),
      probability: input.probability ?? null,
      expected_close_date: input.expectedCloseDate ?? null,
      client_id: input.clientId ?? null,
      notes: input.notes ?? null,
      created_by: profile.id,
      updated_by: profile.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  revalidateOpsPaths();
  return { ok: true as const, id: data.id };
}

export async function createBusinessIncomeAction(raw: CreateBusinessIncomeInput) {
  const { profile, workspace, supabase } = await workspaceContext();
  const input = createBusinessIncomeSchema.parse(raw);

  const { data, error } = await (supabase as any)
    .from("business_income")
    .insert({
      workspace_id: workspace.workspaceId,
      client_id: input.clientId ?? null,
      expected_amount: input.expectedAmount ? toDbMoney(parseMoney(input.expectedAmount)) : null,
      received_amount: input.receivedAmount ? toDbMoney(parseMoney(input.receivedAmount)) : null,
      expected_date: input.expectedDate ?? null,
      received_date: input.receivedDate ?? null,
      status: input.status,
      notes: input.notes ?? null,
      created_by: profile.id,
      updated_by: profile.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  revalidateOpsPaths();
  return { ok: true as const, id: data.id };
}

export async function createBusinessExpenseAction(raw: CreateBusinessExpenseInput) {
  const { profile, workspace, supabase } = await workspaceContext();
  const input = createBusinessExpenseSchema.parse(raw);
  const amount = parseMoney(input.amountPkr);
  if (amount <= 0) throw new Error("Expense amount must be greater than zero.");

  const { data, error } = await (supabase as any)
    .from("business_expenses")
    .insert({
      workspace_id: workspace.workspaceId,
      name: input.name,
      amount_pkr: toDbMoney(amount),
      expense_date: input.expenseDate ?? new Date().toISOString().slice(0, 10),
      category_id: input.categoryId ?? null,
      recurring: input.recurring,
      created_by: profile.id,
      updated_by: profile.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  revalidateOpsPaths();
  return { ok: true as const, id: data.id };
}
