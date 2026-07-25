"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Download, Plus, Receipt } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import {
  TransactionTable,
  TransactionMobileCard,
} from "@/components/finance/transaction-table";
import { FilterBar } from "@/components/finance/filter-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/providers/app-provider";
import type { getTransactions, getTransactionFilterOptions } from "@/data/transactions/queries";
import { profilesToUserMap } from "@/data/profiles/helpers";

type TransactionsResult = Awaited<ReturnType<typeof getTransactions>>;
type FilterOptions = Awaited<ReturnType<typeof getTransactionFilterOptions>>;

interface TransactionsClientProps {
  result: TransactionsResult;
  filterOptions: FilterOptions;
  initialFilters: Record<string, unknown>;
}

export function TransactionsClient({
  result,
  filterOptions,
  initialFilters,
}: TransactionsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { hideBalances, setQuickAddOpen } = useApp();
  const usersByProfileId = profilesToUserMap(filterOptions.profiles);

  const [search, setSearch] = React.useState(String(initialFilters.search ?? ""));
  const [accountId, setAccountId] = React.useState(
    String(initialFilters.accountId ?? "all")
  );
  const [ownerId, setOwnerId] = React.useState(String(initialFilters.ownerProfileId ?? "all"));
  const [categoryId, setCategoryId] = React.useState(String(initialFilters.categoryId ?? "all"));
  const [type, setType] = React.useState(String(initialFilters.type ?? "all"));
  const [archived, setArchived] = React.useState(String(initialFilters.archived ?? "active"));

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (accountId !== "all") params.set("account", accountId);
      if (ownerId !== "all") params.set("owner", ownerId);
      if (categoryId !== "all") params.set("category", categoryId);
      if (type !== "all") params.set("type", type);
      if (archived !== "active") params.set("archived", archived);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, accountId, ownerId, categoryId, type, archived, pathname, router]);

  const handleExport = () => {
    const rows = [
      ["Date", "Name", "Type", "Account", "Amount PKR", "Status"].join(","),
      ...result.transactions.map((t) =>
        [t.date, `"${t.name}"`, t.type, t.accountName ?? t.accountId, t.amountPkr, t.status].join(
          ","
        )
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hisab-transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Transactions"
        description="Search and filter every completed, pending, and expected movement."
      >
        <Button variant="outline" onClick={handleExport} className="gap-1.5">
          <Download className="h-4 w-4" />
          Export
        </Button>
        <Button onClick={() => setQuickAddOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add transaction
        </Button>
      </PageHeader>

      <section className="mb-6 rounded-[12px] border border-border bg-card p-4">
        <FilterBar search={search} onSearchChange={setSearch} onClear={() => {
          setSearch("");
          setAccountId("all");
          setOwnerId("all");
          setCategoryId("all");
          setType("all");
          setArchived("active");
        }}>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {filterOptions.accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All people</SelectItem>
              {filterOptions.profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {filterOptions.categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={archived} onValueChange={setArchived}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Archive" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="transfer">Transfers</SelectItem>
              <SelectItem value="transfer_in">Transfer in</SelectItem>
              <SelectItem value="transfer_out">Transfer out</SelectItem>
              <SelectItem value="balance_adjustment">Balance correction</SelectItem>
              <SelectItem value="linked_transfer">Linked transfers</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>
      </section>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {result.transactions.length} of {result.total}
        </p>
      </div>

      {result.transactions.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No transactions match"
          description="Adjust filters or add your first transaction."
          actionLabel="Add transaction"
          onAction={() => setQuickAddOpen(true)}
        />
      ) : (
        <>
          <TransactionTable
            transactions={result.transactions}
            hidden={hideBalances}
            profiles={filterOptions.profiles}
            currentProfileId={result.currentProfileId}
          />
          <div className="mt-3 space-y-2 md:hidden">
            {result.transactions.map((txn) => (
              <TransactionMobileCard
                key={txn.id}
                transaction={txn}
                hidden={hideBalances}
                profiles={filterOptions.profiles}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
