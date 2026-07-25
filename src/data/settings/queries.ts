import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import { requireCurrentWorkspace } from "@/data/workspaces/queries";
import { getAccounts } from "@/data/accounts/queries";
import { getActiveCategories, getActiveIncomeSources } from "@/data/categories/queries";
import { getLoans } from "@/data/loans/queries";
import { parseMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function getSettingsPageData() {
  const profile = await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const supabase = await createClient();

  const [accountsResult, categories, incomeSources, loans, settingsRes] = await Promise.all([
    getAccounts(),
    getActiveCategories(),
    getActiveIncomeSources(),
    getLoans(),
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (supabase as any)
        .from("app_settings")
        .select("*")
        .eq("workspace_id", workspace.workspaceId);
    })(),
  ]);

  const settingsMap = new Map(
    (settingsRes.data ?? []).map((row: { key: string; value_json: unknown }) => [row.key, row.value_json])
  );

  return {
    profile,
    workspace,
    accounts: accountsResult.accounts,
    categories,
    incomeSources,
    loans,
    settings: {
      comfortableSavingsRate: Number(settingsMap.get("comfortable_savings_rate") ?? 0.15),
      balancedSavingsRate: Number(settingsMap.get("balanced_savings_rate") ?? 0.25),
      aggressiveSavingsRate: Number(settingsMap.get("aggressive_savings_rate") ?? 0.35),
      budgetWarningThreshold: Number(settingsMap.get("budget_warning_threshold") ?? 0.8),
      budgetExceededThreshold: Number(settingsMap.get("budget_exceeded_threshold") ?? 1),
      defaultCurrency: String(settingsMap.get("default_currency") ?? "PKR"),
      allowTransferOverdraft: Boolean(settingsMap.get("allow_transfer_overdraft") ?? false),
    },
  };
}

export async function getExchangeRate(from = "USD", to = "PKR") {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("exchange_rate_cache")
    .select("*")
    .eq("from_currency", from)
    .eq("to_currency", to)
    .maybeSingle();

  if (data) {
    return {
      from: from as "USD" | "PKR",
      to: to as "USD" | "PKR",
      rate: parseMoney(data.rate),
      source: data.source,
      timestamp: data.fetched_at,
    };
  }

  return {
    from: from as "USD" | "PKR",
    to: to as "USD" | "PKR",
    rate: 278.5,
    source: "static-fallback (not live — refresh or configure EXCHANGE_RATE_API_KEY)",
    timestamp: new Date().toISOString(),
  };
}
