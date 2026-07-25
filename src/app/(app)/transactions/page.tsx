import { getTransactions, getTransactionFilterOptions } from "@/data/transactions/queries";
import { TransactionsClient } from "./transactions-client";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = {
    search: typeof params.q === "string" ? params.q : undefined,
    accountId: typeof params.account === "string" ? params.account : undefined,
    ownerProfileId: typeof params.owner === "string" ? params.owner : undefined,
    categoryId: typeof params.category === "string" ? params.category : undefined,
    type: typeof params.type === "string" ? params.type : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    archived:
      typeof params.archived === "string"
        ? (params.archived as "active" | "archived" | "all")
        : "active",
    page: typeof params.page === "string" ? Number(params.page) : 1,
    pageSize: typeof params.pageSize === "string" ? Number(params.pageSize) : 25,
  };

  const [result, options] = await Promise.all([
    getTransactions(filters),
    getTransactionFilterOptions(),
  ]);

  return (
    <TransactionsClient
      result={result}
      filterOptions={options}
      initialFilters={filters}
    />
  );
}
