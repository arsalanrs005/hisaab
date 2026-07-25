import type {
  BusinessClient,
  BusinessIncome,
  BusinessExpense,
  UpworkActivity,
  LinkedInActivity,
} from "@/types";

export const businessClients: BusinessClient[] = [
  {
    id: "client-questrock",
    name: "QuestRock",
    status: "active",
    monthlyRetainer: 280000,
    projectRevenue: 0,
    expectedIncome: 280000,
    receivedIncome: 280000,
    pipelineStage: "Retainer",
  },
  {
    id: "client-greg",
    name: "Greg",
    status: "pipeline",
    monthlyRetainer: 0,
    projectRevenue: 334200,
    expectedIncome: 334200,
    receivedIncome: 0,
    pipelineStage: "Expected payment",
  },
  {
    id: "client-jason",
    name: "Jason",
    status: "active",
    monthlyRetainer: 0,
    projectRevenue: 125325,
    expectedIncome: 0,
    receivedIncome: 125325,
    pipelineStage: "Project delivery",
  },
  {
    id: "client-helloforce",
    name: "HelloForce",
    status: "active",
    monthlyRetainer: 0,
    projectRevenue: 181025,
    expectedIncome: 150000,
    receivedIncome: 181025,
    pipelineStage: "Phase 2 proposal",
  },
  {
    id: "client-geoey",
    name: "Geoey",
    status: "pipeline",
    monthlyRetainer: 0,
    projectRevenue: 0,
    expectedIncome: 200000,
    receivedIncome: 0,
    pipelineStage: "Discovery call",
  },
];

export const businessIncomes: BusinessIncome[] = [
  {
    id: "bi-1",
    clientId: "client-questrock",
    amount: 280000,
    date: "2026-07-22",
    type: "retainer",
    received: true,
  },
  {
    id: "bi-2",
    clientId: "client-helloforce",
    amount: 181025,
    date: "2026-07-19",
    type: "project",
    received: true,
  },
  {
    id: "bi-3",
    clientId: "client-jason",
    amount: 125325,
    date: "2026-07-12",
    type: "project",
    received: true,
  },
  {
    id: "bi-4",
    clientId: "client-greg",
    amount: 334200,
    date: "2026-07-28",
    type: "expected",
    received: false,
    note: "Still marked as expected",
  },
];

export const businessExpenses: BusinessExpense[] = [
  {
    id: "be-1",
    name: "Designer salary",
    amount: 75000,
    date: "2026-07-15",
    category: "Employee",
    isEmployeePayment: true,
  },
  {
    id: "be-2",
    name: "Developer contractor",
    amount: 75000,
    date: "2026-07-15",
    category: "Employee",
    isEmployeePayment: true,
  },
  {
    id: "be-3",
    name: "Software tools",
    amount: 28000,
    date: "2026-07-05",
    category: "Tools",
    isEmployeePayment: false,
  },
  {
    id: "be-4",
    name: "Upwork connects & fees",
    amount: 12000,
    date: "2026-07-10",
    category: "Sales",
    isEmployeePayment: false,
  },
];

export const upworkActivities: UpworkActivity[] = [
  {
    id: "uw-1",
    title: "SaaS analytics dashboard rebuild",
    client: "HelloForce",
    status: "won",
    connectsSpent: 16,
    bidAmount: 650,
    date: "2026-07-05",
    revenue: 181025,
  },
  {
    id: "uw-2",
    title: "Fintech onboarding flow",
    client: "NordPay",
    status: "interview",
    connectsSpent: 12,
    bidAmount: 800,
    date: "2026-07-18",
    followUpDate: "2026-07-25",
  },
  {
    id: "uw-3",
    title: "Next.js marketing site",
    client: "BrightLeaf",
    status: "responded",
    connectsSpent: 8,
    bidAmount: 450,
    date: "2026-07-20",
    followUpDate: "2026-07-24",
  },
  {
    id: "uw-4",
    title: "Admin panel redesign",
    client: "Stackly",
    status: "sent",
    connectsSpent: 6,
    bidAmount: 520,
    date: "2026-07-22",
  },
  {
    id: "uw-5",
    title: "Mobile-responsive CRM UI",
    client: "Pipekit",
    status: "offer",
    connectsSpent: 14,
    bidAmount: 900,
    date: "2026-07-12",
    followUpDate: "2026-07-24",
  },
  {
    id: "uw-6",
    title: "E-commerce checkout UX",
    client: "Cartly",
    status: "lost",
    connectsSpent: 10,
    bidAmount: 400,
    date: "2026-07-08",
  },
];

export const linkedInActivities: LinkedInActivity[] = [
  {
    id: "li-1",
    prospectName: "Sarah Chen",
    company: "Geoey",
    title: "Head of Product",
    status: "call",
    date: "2026-07-15",
    followUpDate: "2026-07-25",
    notes: "Interested in design system overhaul",
  },
  {
    id: "li-2",
    prospectName: "Marcus Webb",
    company: "LumenOps",
    title: "CEO",
    status: "conversation",
    date: "2026-07-18",
    followUpDate: "2026-07-24",
  },
  {
    id: "li-3",
    prospectName: "Priya Nair",
    company: "Vaultly",
    title: "CTO",
    status: "accepted",
    date: "2026-07-20",
    followUpDate: "2026-07-26",
  },
  {
    id: "li-4",
    prospectName: "James Okafor",
    company: "Northwind AI",
    title: "Founder",
    status: "requested",
    date: "2026-07-22",
  },
  {
    id: "li-5",
    prospectName: "Elena Rossi",
    company: "Paystack EU",
    title: "VP Engineering",
    status: "identified",
    date: "2026-07-21",
  },
  {
    id: "li-6",
    prospectName: "Tom Bradley",
    company: "QuestRock",
    title: "COO",
    status: "won",
    date: "2026-06-10",
    revenue: 280000,
    notes: "Converted to monthly retainer",
  },
  {
    id: "li-7",
    prospectName: "Amy Foster",
    company: "Clearbit-adjacent",
    title: "Product Lead",
    status: "researched",
    date: "2026-07-23",
  },
  {
    id: "li-8",
    prospectName: "David Kim",
    company: "Forma Labs",
    title: "Founder",
    status: "proposal",
    date: "2026-07-14",
    followUpDate: "2026-07-24",
  },
];

export function getOps5iveMetrics() {
  const monthlyRecurring = businessClients.reduce((s, c) => s + c.monthlyRetainer, 0);
  const projectRevenue = businessClients.reduce((s, c) => s + c.projectRevenue, 0);
  const expectedIncome = businessClients.reduce((s, c) => s + c.expectedIncome, 0);
  const receivedIncome = businessClients.reduce((s, c) => s + c.receivedIncome, 0);
  const expenses = businessExpenses.reduce((s, e) => s + e.amount, 0);
  const employeePayments = businessExpenses
    .filter((e) => e.isEmployeePayment)
    .reduce((s, e) => s + e.amount, 0);
  const netProfit = receivedIncome - expenses;
  const businessReserve = 410000;
  const reinvestment = Math.round(netProfit * 0.2);
  return {
    monthlyRecurring,
    projectRevenue,
    expectedIncome,
    receivedIncome,
    expenses,
    employeePayments,
    netProfit,
    businessReserve,
    reinvestment,
  };
}
