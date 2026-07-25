import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import { requireCurrentWorkspace } from "@/data/workspaces/queries";

export const dynamic = "force-dynamic";

import type { SearchResult } from "@/data/search/types";

export type { SearchResult };

export async function globalSearch(query: string, limit = 20): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const supabase = await createClient();
  const q = query.trim();
  const escaped = q.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/%/g, "\\%").replace(/_/g, "\\_");
  const results: SearchResult[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const [txns, accounts, notes, goals, clients] = await Promise.all([
    db
      .from("transactions")
      .select("id, description, notes")
      .eq("workspace_id", workspace.workspaceId)
      .is("archived_at", null)
      .or(`description.ilike.%${escaped}%,notes.ilike.%${escaped}%`)
      .limit(5),
    db
      .from("accounts")
      .select("id, name, bank_name")
      .eq("workspace_id", workspace.workspaceId)
      .eq("is_active", true)
      .ilike("name", `%${escaped}%`)
      .limit(5),
    db
      .from("notes")
      .select("id, title")
      .eq("workspace_id", workspace.workspaceId)
      .is("archived_at", null)
      .or(`title.ilike.%${escaped}%,plain_text.ilike.%${escaped}%`)
      .limit(5),
    db
      .from("financial_goals")
      .select("id, name")
      .eq("workspace_id", workspace.workspaceId)
      .is("archived_at", null)
      .ilike("name", `%${escaped}%`)
      .limit(3),
    db
      .from("business_clients")
      .select("id, name")
      .eq("workspace_id", workspace.workspaceId)
      .is("archived_at", null)
      .ilike("name", `%${escaped}%`)
      .limit(3),
  ]);

  for (const row of txns.data ?? []) {
    results.push({
      id: row.id,
      type: "transaction",
      title: row.description ?? "Transaction",
      subtitle: row.notes ?? undefined,
      href: `/transactions?q=${encodeURIComponent(row.id)}`,
    });
  }
  for (const row of accounts.data ?? []) {
    results.push({
      id: row.id,
      type: "account",
      title: row.name,
      subtitle: row.bank_name,
      href: `/accounts/${row.id}`,
    });
  }
  for (const row of notes.data ?? []) {
    results.push({
      id: row.id,
      type: "note",
      title: row.title,
      href: `/notes?note=${row.id}`,
    });
  }
  for (const row of goals.data ?? []) {
    results.push({
      id: row.id,
      type: "goal",
      title: row.name,
      href: `/goals/${row.id}`,
    });
  }
  for (const row of clients.data ?? []) {
    results.push({
      id: row.id,
      type: "client",
      title: row.name,
      href: `/ops5ive`,
    });
  }

  return results.slice(0, limit);
}
