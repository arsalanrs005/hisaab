import { describe, expect, it } from "vitest";
import {
  countsAsExpense,
  countsAsIncome,
  isTransferType,
  isBalanceAdjustmentType,
} from "@/lib/finance/transaction-metrics";
import { buildAccountCapabilities } from "@/lib/finance/capabilities";
import { createTransferSchema } from "@/data/transfers/validation";
import { reconcileAccountSchema } from "@/data/reconciliation/validation";

describe("transaction metrics", () => {
  it("excludes transfers from income and expense", () => {
    expect(countsAsIncome("transfer_in")).toBe(false);
    expect(countsAsExpense("transfer_out")).toBe(false);
    expect(isTransferType("transfer_in")).toBe(true);
  });

  it("excludes balance adjustments from income and expense", () => {
    expect(countsAsIncome("balance_adjustment")).toBe(false);
    expect(countsAsExpense("balance_adjustment")).toBe(false);
    expect(isBalanceAdjustmentType("balance_adjustment")).toBe(true);
  });

  it("counts normal income and expense", () => {
    expect(countsAsIncome("income")).toBe(true);
    expect(countsAsExpense("expense")).toBe(true);
  });
});

describe("account capabilities", () => {
  it("allows transfer out only for owner", () => {
    const owner = buildAccountCapabilities("a", "a", false, true, null);
    const viewer = buildAccountCapabilities("a", "b", false, true, null);
    expect(owner.canTransferOut).toBe(true);
    expect(viewer.canTransferOut).toBe(false);
    expect(viewer.canReceiveTransfer).toBe(true);
  });

  it("allows reconcile only for owner", () => {
    const owner = buildAccountCapabilities("a", "a", false, true, null);
    const viewer = buildAccountCapabilities("a", "b", false, true, null);
    expect(owner.canReconcile).toBe(true);
    expect(viewer.canReconcile).toBe(false);
  });
});

describe("transfer validation", () => {
  it("rejects same source and destination", () => {
    expect(() =>
      createTransferSchema.parse({
        sourceAccountId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        destinationAccountId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        amount: "100",
        currency: "PKR",
        date: "2026-07-24",
      })
    ).toThrow();
  });
});

describe("reconciliation validation", () => {
  it("requires a meaningful reason", () => {
    expect(() =>
      reconcileAccountSchema.parse({
        accountId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        actualBalance: "1000",
        reason: "  ",
      })
    ).toThrow();
  });
});
