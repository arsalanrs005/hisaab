export * from "./users";
export * from "./accounts";
export * from "./categories";
export * from "./transactions";
export * from "./goals";
export * from "./loans";
export * from "./budget";
export * from "./notes";
export * from "./ops5ive";
export * from "./insights";

import {
  getTotalBalance,
  getTotalAvailable,
  getTotalProtected,
} from "./accounts";
import { getMonthlyIncome, getMonthlyExpenses } from "./transactions";
import { savingsPlan } from "./insights";

export function getDashboardSummary() {
  const totalMoney = getTotalBalance();
  const available = getTotalAvailable();
  const protectedSavings = getTotalProtected();
  const monthlyIncome = getMonthlyIncome();
  const monthlyExpenses = getMonthlyExpenses();
  const netSaved = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (netSaved / monthlyIncome) * 100 : 0;

  return {
    totalMoney,
    available,
    protectedSavings,
    monthlyIncome,
    monthlyExpenses,
    netSaved,
    savingsRate,
    incomeChangePercent: 8.4,
    budgetVariance: -120000,
    savingsPlan,
  };
}
