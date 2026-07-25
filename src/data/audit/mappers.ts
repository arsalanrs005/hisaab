import type { Tables } from "@/types/database";
import type { ProfileSummary } from "@/data/profiles/helpers";
import { parseMoney } from "@/lib/money";

export type AuditLogRow = Tables<"audit_logs">;

export interface UiAuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  accountId: string | null;
  actorProfileId: string | null;
  actorName: string;
  summary: string;
  createdAt: string;
  href?: string;
  metadata?: Record<string, unknown>;
}

function formatMoney(value: unknown): string {
  if (value === null || value === undefined) return "—";
  return `PKR ${parseMoney(value as string | number).toLocaleString("en-PK")}`;
}

export function summarizeAuditEvent(
  row: AuditLogRow,
  profiles: ProfileSummary[],
  accountName?: string
): UiAuditEvent {
  const actorName =
    profiles.find((p) => p.id === row.actor_profile_id)?.display_name ?? "System";
  const newValues = (row.new_values ?? {}) as Record<string, unknown>;
  const oldValues = (row.old_values ?? {}) as Record<string, unknown>;

  let summary = row.action;
  let href: string | undefined;

  switch (row.action) {
    case "transfer.create":
      summary = `${actorName} transferred ${formatMoney(newValues.amount_pkr)} between accounts.`;
      if (row.entity_id) href = `/transfers?detail=${row.entity_id}`;
      break;
    case "account.reconcile": {
      const adj = newValues.adjustment_amount;
      summary = `${actorName} reconciled ${accountName ?? "an account"} (${formatMoney(adj)} adjustment).`;
      if (row.entity_id) href = `/accounts/${row.account_id ?? ""}`;
      break;
    }
    case "transaction.archive":
      summary = `${actorName} archived a transaction.`;
      if (row.entity_id) href = `/transactions`;
      break;
    case "transaction.restore":
      summary = `${actorName} restored a transaction.`;
      if (row.entity_id) href = `/transactions`;
      break;
    case "contribution.opening_allocate":
      summary = `${actorName} allocated opening contributions for ${accountName ?? "shared savings"}.`;
      break;
    default:
      summary = `${actorName} · ${row.action.replace(/\./g, " ")}`;
  }

  return {
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    accountId: row.account_id,
    actorProfileId: row.actor_profile_id,
    actorName,
    summary,
    createdAt: row.created_at,
    href,
    metadata: { newValues, oldValues },
  };
}
