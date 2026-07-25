import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile, getAllProfiles } from "@/data/profiles/queries";
import { requireCurrentWorkspace } from "@/data/workspaces/queries";
import { summarizeAuditEvent, type UiAuditEvent } from "@/data/audit/mappers";
import type { Tables } from "@/types/database";

export const auditFilterSchema = z.object({
  search: z.string().optional(),
  actorProfileId: z.string().uuid().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  accountId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  sort: z.enum(["date_desc", "date_asc"]).optional().default("date_desc"),
});

export type AuditFilterInput = z.infer<typeof auditFilterSchema>;

export async function getAuditLogs(rawFilters: Partial<AuditFilterInput> = {}) {
  await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const filters = auditFilterSchema.parse(rawFilters);
  const supabase = await createClient();
  const profiles = await getAllProfiles();

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .eq("workspace_id", workspace.workspaceId);

  if (filters.actorProfileId) query = query.eq("actor_profile_id", filters.actorProfileId);
  if (filters.action && filters.action !== "all") query = query.eq("action", filters.action);
  if (filters.entityType && filters.entityType !== "all") query = query.eq("entity_type", filters.entityType);
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("created_at", filters.dateTo);
  if (filters.search?.trim()) {
    query = query.or(
      `action.ilike.%${filters.search.trim()}%,entity_type.ilike.%${filters.search.trim()}%`
    );
  }

  query =
    filters.sort === "date_asc"
      ? query.order("created_at", { ascending: true })
      : query.order("created_at", { ascending: false });

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error("Unable to load activity log.");

  const accountIds = [...new Set((data ?? []).map((r: Tables<"audit_logs">) => r.account_id).filter(Boolean))] as string[];
  const { data: accounts } = accountIds.length
    ? await supabase.from("accounts").select("id, name").in("id", accountIds)
    : { data: [] };
  const accountNameById = new Map((accounts ?? []).map((a) => [a.id, a.name]));

  const events: UiAuditEvent[] = (data ?? []).map((row: Tables<"audit_logs">) =>
    summarizeAuditEvent(row, profiles, row.account_id ? accountNameById.get(row.account_id) : undefined)
  );

  return { events, total: count ?? events.length, page: filters.page, pageSize: filters.pageSize, profiles };
}

export async function getRecentAuditActivity(limit = 10) {
  const result = await getAuditLogs({ page: 1, pageSize: limit });
  return result.events;
}

export async function getAuditEventsForAccount(accountId: string, limit = 20) {
  const result = await getAuditLogs({ accountId, page: 1, pageSize: limit });
  return result.events;
}
