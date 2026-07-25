"use server";

import { getOwnedAccountsForForms } from "@/data/accounts/queries";
import { getActiveCategories, getActiveIncomeSources } from "@/data/categories/queries";

export async function getQuickAddFormData() {
  const [accounts, categories, incomeSources] = await Promise.all([
    getOwnedAccountsForForms(),
    getActiveCategories(),
    getActiveIncomeSources(),
  ]);
  return { accounts, categories, incomeSources };
}
