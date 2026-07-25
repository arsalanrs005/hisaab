import type {
  FinancialInsight,
  SavingsPlan,
  Notification,
  ChartPoint,
  CategorySpend,
  AuditLog,
} from "@/types";

export const savingsPlan: SavingsPlan = {
  mode: "balanced",
  monthlyTarget: 780000,
  actualSavings: 645000,
  recommendedSavings: 780000,
  remaining: 135000,
  explanation:
    "Balanced plan targets 45% of combined cleared income after fixed obligations (loans, employee payments, university).",
  formula:
    "Recommended = (Monthly income − Fixed obligations) × 0.45\n= (PKR 1,866,350 − PKR 350,000) × 0.45 ≈ PKR 780,000",
};

export const insights: FinancialInsight[] = [
  {
    id: "ins-1",
    title: "Food spending is 18% higher than last month",
    detail: "Current food spend PKR 94,500 vs previous PKR 80,000.",
    formula: "(94500 − 80000) / 80000 × 100 = 18.1%",
    severity: "warning",
    href: "/budget",
  },
  {
    id: "ins-2",
    title: "You are PKR 135,000 behind the balanced savings plan",
    detail: "Recommended PKR 780,000 · Saved PKR 645,000 this month.",
    formula: "780000 − 645000 = 135000 remaining",
    severity: "warning",
    href: "/goals",
  },
  {
    id: "ins-3",
    title: "The emergency fund currently covers 1.7 months",
    detail: "Emergency saved PKR 520,000 against average monthly expenses ~PKR 300,000.",
    formula: "520000 / 300000 ≈ 1.7 months",
    severity: "info",
    href: "/goals/goal-emergency",
  },
  {
    id: "ins-4",
    title:
      "Increasing monthly Elantra contributions by PKR 50,000 moves completion forward by two months",
    detail: "At PKR 170,000/mo vs PKR 120,000/mo, remaining PKR 2,820,000 closes sooner.",
    formula: "2820000 / 120000 ≈ 23.5 mo · 2820000 / 170000 ≈ 16.6 mo (−≈7 mo; ~2 mo if applied mid-year ramp)",
    severity: "positive",
    href: "/goals/goal-elantra",
  },
  {
    id: "ins-5",
    title: "Greg’s payment is still marked as expected",
    detail: "USD 1,200 (≈ PKR 334,200) due around 28 Jul — not yet cleared.",
    formula: "Status = expected · Amount = 1200 × 278.5",
    severity: "info",
    href: "/ops5ive",
  },
];

export const notifications: Notification[] = [
  {
    id: "notif-1",
    title: "Greg payment expected",
    message: "USD 1,200 marked expected for 28 Jul.",
    type: "reminder",
    read: false,
    createdAt: "2026-07-23T08:00:00Z",
    href: "/transactions",
  },
  {
    id: "notif-2",
    title: "Food budget at 118%",
    message: "Food category has exceeded the July budget.",
    type: "warning",
    read: false,
    createdAt: "2026-07-22T18:00:00Z",
    href: "/budget",
  },
  {
    id: "notif-3",
    title: "Ali contributed to Meezan",
    message: "PKR 85,000 transferred into pooled savings.",
    type: "success",
    read: true,
    createdAt: "2026-07-22T12:00:00Z",
    href: "/accounts/acc-arsalan-meezan",
  },
  {
    id: "notif-4",
    title: "Car loan due in 5 days",
    message: "Installment PKR 85,000 due on 18 Aug.",
    type: "reminder",
    read: true,
    createdAt: "2026-07-21T09:00:00Z",
    href: "/loans",
  },
  {
    id: "notif-5",
    title: "LinkedIn follow-up",
    message: "Marcus Webb conversation is due today.",
    type: "info",
    read: false,
    createdAt: "2026-07-24T07:00:00Z",
    href: "/ops5ive/linkedin",
  },
];

export const incomeVsExpenses: ChartPoint[] = [
  { label: "Jan", value: 1400000, secondary: 920000 },
  { label: "Feb", value: 1550000, secondary: 980000 },
  { label: "Mar", value: 1480000, secondary: 1010000 },
  { label: "Apr", value: 1620000, secondary: 990000 },
  { label: "May", value: 1710000, secondary: 1050000 },
  { label: "Jun", value: 1680000, secondary: 1100000 },
  { label: "Jul", value: 1866350, secondary: 632700 },
];

export const savingsGrowth: ChartPoint[] = [
  { label: "Jan", value: 2100000 },
  { label: "Feb", value: 2350000 },
  { label: "Mar", value: 2580000 },
  { label: "Apr", value: 2820000 },
  { label: "May", value: 3100000 },
  { label: "Jun", value: 3380000 },
  { label: "Jul", value: 3640000 },
];

export const spendingByCategory: CategorySpend[] = [
  { category: "Employee", amount: 150000, color: "#115e59" },
  { category: "Loan", amount: 120000, color: "#991b1b" },
  { category: "Food", amount: 94500, color: "#c2410c" },
  { category: "Business", amount: 82000, color: "#3730a3" },
  { category: "Bills", amount: 48000, color: "#4b5563" },
  { category: "University", amount: 45000, color: "#1d4ed8" },
  { category: "Other", amount: 93100, color: "#6b7280" },
];

export const monthlyCashFlow: ChartPoint[] = [
  { label: "Week 1", value: 420000 },
  { label: "Week 2", value: -85000 },
  { label: "Week 3", value: 310000 },
  { label: "Week 4", value: 185000 },
];

export const goalAllocation: CategorySpend[] = [
  { category: "House", amount: 200000, color: "#1e40af" },
  { category: "Ops5ive", amount: 150000, color: "#115e59" },
  { category: "Elantra", amount: 120000, color: "#4338ca" },
  { category: "Emergency", amount: 100000, color: "#0f766e" },
  { category: "Car loan", amount: 85000, color: "#991b1b" },
];

export const auditLogs: AuditLog[] = [
  {
    id: "audit-1",
    actorId: "ali",
    action: "created_transfer",
    entityType: "transfer",
    entityId: "trf-1",
    timestamp: "2026-07-22T11:30:00Z",
    details: "Ali HBL → Arsalan Meezan · PKR 85,000",
  },
  {
    id: "audit-2",
    actorId: "arsalan",
    action: "reconciled_balance",
    entityType: "balance_adjustment",
    entityId: "adj-1",
    timestamp: "2026-07-18T14:30:00Z",
    details: "Arsalan HBL adjusted by −PKR 2,500",
  },
];
