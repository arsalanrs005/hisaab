"use server";

import { globalSearch } from "@/data/search/queries";

export async function globalSearchAction(query: string) {
  return globalSearch(query);
}
