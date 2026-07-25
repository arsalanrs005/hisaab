import type { Account, Contribution } from "@/types";

export const accounts: Account[] = [
  {
    id: "acc-arsalan-meezan",
    name: "Arsalan Meezan",
    bank: "Meezan Bank",
    ownerId: "arsalan",
    currency: "PKR",
    currentBalance: 1850000,
    availableBalance: 1120000,
    protectedSavings: 730000,
    isPooled: true,
    lastReconciledAt: "2026-07-20T10:00:00Z",
    trend: [1520000, 1580000, 1610000, 1680000, 1720000, 1780000, 1850000],
    recentActivityLabel: "Ali contribution · yesterday",
  },
  {
    id: "acc-arsalan-hbl",
    name: "Arsalan HBL",
    bank: "HBL",
    ownerId: "arsalan",
    currency: "PKR",
    currentBalance: 420000,
    availableBalance: 390000,
    protectedSavings: 30000,
    isPooled: false,
    lastReconciledAt: "2026-07-18T14:30:00Z",
    trend: [380000, 395000, 410000, 400000, 415000, 430000, 420000],
    recentActivityLabel: "Fuel expense · 2 days ago",
  },
  {
    id: "acc-ali-hbl",
    name: "Ali HBL",
    bank: "HBL",
    ownerId: "ali",
    currency: "PKR",
    currentBalance: 680000,
    availableBalance: 520000,
    protectedSavings: 160000,
    isPooled: false,
    lastReconciledAt: "2026-07-19T09:15:00Z",
    trend: [540000, 560000, 590000, 610000, 640000, 660000, 680000],
    recentActivityLabel: "Upwork payout · 3 days ago",
  },
];

export const contributions: Contribution[] = [
  {
    id: "contrib-1",
    accountId: "acc-arsalan-meezan",
    contributorId: "arsalan",
    amount: 450000,
    date: "2026-07-01",
    note: "July pooled savings",
  },
  {
    id: "contrib-2",
    accountId: "acc-arsalan-meezan",
    contributorId: "ali",
    amount: 280000,
    date: "2026-07-01",
    note: "July pooled savings",
  },
  {
    id: "contrib-3",
    accountId: "acc-arsalan-meezan",
    contributorId: "arsalan",
    amount: 120000,
    date: "2026-07-15",
    note: "Mid-month top-up",
  },
  {
    id: "contrib-4",
    accountId: "acc-arsalan-meezan",
    contributorId: "ali",
    amount: 85000,
    date: "2026-07-22",
    note: "Ops5ive reserve share",
  },
];

export function getAccount(id: string): Account | undefined {
  return accounts.find((a) => a.id === id);
}

export function getAccountContributions(accountId: string): Contribution[] {
  return contributions.filter((c) => c.accountId === accountId);
}

export function getTotalBalance(): number {
  return accounts.reduce((sum, a) => sum + a.currentBalance, 0);
}

export function getTotalAvailable(): number {
  return accounts.reduce((sum, a) => sum + a.availableBalance, 0);
}

export function getTotalProtected(): number {
  return accounts.reduce((sum, a) => sum + a.protectedSavings, 0);
}
