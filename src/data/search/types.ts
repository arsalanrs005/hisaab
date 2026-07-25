export interface SearchResult {
  id: string;
  type: "transaction" | "account" | "note" | "goal" | "client";
  title: string;
  subtitle?: string;
  href: string;
}
