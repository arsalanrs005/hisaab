export type UserId = "arsalan" | "ali" | "anum" | "sarah";
export type Currency = "PKR" | "USD";
export type DashboardMode = "combined" | "personal";
export type ThemeMode = "light" | "dark" | "system";
export type SavingsPlanMode = "comfortable" | "balanced" | "aggressive" | "custom";
export type GoalVisibility = "personal" | "shared" | "business";
export type GoalPriority = "high" | "medium" | "low";
export type TransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "balance_adjustment"
  | "refund"
  | "loan_payment"
  | "loan_repayment"
  | "family_contribution";
export type TransactionStatus = "cleared" | "pending" | "expected" | "cancelled";
export type NotificationType = "info" | "warning" | "success" | "reminder";

export interface User {
  id: UserId;
  name: string;
  email: string;
  initials: string;
  avatarColor: string;
}

export interface Account {
  id: string;
  name: string;
  bank: string;
  ownerId: UserId;
  currency: Currency;
  currentBalance: number;
  availableBalance: number;
  protectedSavings: number;
  isPooled: boolean;
  lastReconciledAt: string;
  trend: number[];
  recentActivityLabel: string;
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense" | "transfer" | "other";
  color: string;
  icon: string;
  isSystem?: boolean;
}

export interface IncomeSource {
  id: string;
  name: string;
  ownerId: UserId;
  expectedMonthly: number;
  currency: Currency;
  active: boolean;
  isShared?: boolean;
  ownerProfileId?: string | null;
}

export interface ExchangeRate {
  from: Currency;
  to: Currency;
  rate: number;
  source: string;
  timestamp: string;
}

export interface Transaction {
  id: string;
  name: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  amountPkr: number;
  accountId: string;
  categoryId: string;
  personId: UserId;
  date: string;
  status: TransactionStatus;
  description?: string;
  notes?: string;
  incomeSourceId?: string;
  goalId?: string;
  isShared: boolean;
  transferId?: string;
  usdAmount?: number;
  exchangeRate?: number;
  rateSource?: string;
  rateTimestamp?: string;
  attachmentName?: string;
  archivedAt?: string;
  createdByProfileId?: string;
  updatedByProfileId?: string;
  balanceAdjustmentId?: string;
  isArchived?: boolean;
  isTransferLinked?: boolean;
  isAdjustmentLinked?: boolean;
  dbType?: string;
  direction?: -1 | 1;
  classification?: "personal" | "shared" | "business";
  accountName?: string;
  categoryName?: string;
  ownerProfileId?: string;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  initiatedBy: UserId;
  contributionOwnerId?: UserId;
  date: string;
  notes?: string;
  fromTransactionId: string;
  toTransactionId: string;
}

export interface BalanceAdjustment {
  id: string;
  accountId: string;
  calculatedBalance: number;
  actualBalance: number;
  difference: number;
  reason: string;
  date: string;
  createdBy: UserId;
  transactionId: string;
}

export interface Contribution {
  id: string;
  accountId: string;
  contributorId: UserId;
  amount: number;
  date: string;
  note?: string;
  transactionId?: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  monthlyContribution: number;
  ownerId: UserId;
  visibility: GoalVisibility;
  priority: GoalPriority;
  estimatedCompletion: string;
  fundingAccountIds: string[];
  relatedNoteIds: string[];
  color: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  contributorId: UserId;
  amount: number;
  date: string;
  accountId: string;
  note?: string;
}

export interface Loan {
  id: string;
  name: string;
  ownerId: UserId;
  originalAmount: number;
  remainingBalance: number;
  monthlyInstallment: number;
  interestRate: number;
  dueDay: number;
  fundingAccountId: string;
  startDate: string;
  expectedCompletion: string;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  amount: number;
  date: string;
  accountId: string;
  note?: string;
  principal: number;
  interest: number;
}

export interface BudgetCategory {
  categoryId: string;
  budgeted: number;
  spent: number;
  previousMonthSpent: number;
}

export interface Budget {
  id: string;
  month: string;
  categories: BudgetCategory[];
}

export interface NoteFolder {
  id: string;
  name: string;
  icon: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string;
  ownerId: UserId;
  tags: string[];
  priority: GoalPriority;
  pinned: boolean;
  dueDate?: string;
  checklist: { id: string; text: string; done: boolean }[];
  relatedGoalId?: string;
  relatedAccountId?: string;
  relatedTransactionId?: string;
  relatedBusinessPlan?: string;
  updatedAt: string;
  createdAt: string;
}

export interface BusinessClient {
  id: string;
  name: string;
  status: "active" | "pipeline" | "paused" | "won" | "lost";
  monthlyRetainer: number;
  projectRevenue: number;
  expectedIncome: number;
  receivedIncome: number;
  pipelineStage: string;
}

export interface BusinessIncome {
  id: string;
  clientId: string;
  amount: number;
  date: string;
  type: "retainer" | "project" | "expected";
  received: boolean;
  note?: string;
}

export interface BusinessExpense {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
  isEmployeePayment: boolean;
}

export interface UpworkActivity {
  id: string;
  title: string;
  client: string;
  status: "sent" | "responded" | "interview" | "offer" | "won" | "lost";
  connectsSpent: number;
  bidAmount: number;
  date: string;
  followUpDate?: string;
  revenue?: number;
}

export interface LinkedInActivity {
  id: string;
  prospectName: string;
  company: string;
  title: string;
  status:
    | "researched"
    | "identified"
    | "requested"
    | "accepted"
    | "conversation"
    | "call"
    | "proposal"
    | "won"
    | "lost";
  date: string;
  followUpDate?: string;
  revenue?: number;
  notes?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  href?: string;
}

export interface AuditLog {
  id: string;
  actorId: UserId;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  details?: string;
}

export interface SavingsPlan {
  mode: SavingsPlanMode;
  monthlyTarget: number;
  actualSavings: number;
  recommendedSavings: number;
  remaining: number;
  explanation: string;
  formula: string;
}

export interface FinancialInsight {
  id: string;
  title: string;
  detail: string;
  formula: string;
  severity: "info" | "warning" | "positive";
  href?: string;
}

export interface ChartPoint {
  label: string;
  value: number;
  secondary?: number;
}

export interface CategorySpend {
  category: string;
  amount: number;
  color: string;
}

export interface WorkspaceSettings {
  theme: ThemeMode;
  hideBalances: boolean;
  dashboardMode: DashboardMode;
  savingsPlanMode: SavingsPlanMode;
  exchangeRate: ExchangeRate;
}
