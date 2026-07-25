import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Category, IncomeSource } from "@/types";
import { profileIdToLegacyUserId } from "@/data/profiles/helpers";
import { getAllProfiles } from "@/data/profiles/queries";

export const dynamic = "force-dynamic";

export async function getActiveCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, type, icon, is_system")
    .eq("is_active", true)
    .is("archived_at", null)
    .order("name");

  if (error) throw new Error("Unable to load categories.");

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    type:
      row.type === "income"
        ? "income"
        : row.type === "expense"
          ? "expense"
          : "other",
    color: "#3730a3",
    icon: row.icon ?? "circle",
    isSystem: row.is_system,
  }));
}

export async function getActiveIncomeSources(): Promise<IncomeSource[]> {
  const supabase = await createClient();
  const profiles = await getAllProfiles();
  const { data, error } = await supabase
    .from("income_sources")
    .select("*")
    .eq("is_active", true)
    .is("archived_at", null)
    .order("name");

  if (error) throw new Error("Unable to load income sources.");

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    ownerId: row.owner_profile_id
      ? profileIdToLegacyUserId(row.owner_profile_id, profiles)
      : "arsalan",
    expectedMonthly: row.default_expected_amount ? Number(row.default_expected_amount) : 0,
    currency: (row.expected_currency as IncomeSource["currency"]) ?? "PKR",
    active: row.is_active,
    isShared: row.is_shared_income,
    ownerProfileId: row.owner_profile_id,
  }));
}
