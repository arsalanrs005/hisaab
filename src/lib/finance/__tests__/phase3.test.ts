import { describe, expect, it } from "vitest";
import {
  defaultDirectionForType,
  signedTransactionAmount,
  isFormCreatableType,
} from "@/lib/finance/transaction-direction";
import { parseMoney, multiplyMoney, sumMoney } from "@/lib/money";
import { createTransactionSchema } from "@/data/transactions/validation";

describe("money helpers", () => {
  it("parses numeric strings without float drift", () => {
    expect(parseMoney("1000.50")).toBe(1000.5);
    expect(sumMoney(["100.25", "200.75"])).toBe(301);
  });

  it("multiplies USD amounts with exchange rate", () => {
    expect(multiplyMoney("100", "278.5")).toBe(27850);
  });
});

describe("transaction direction", () => {
  it("maps income as positive", () => {
    expect(defaultDirectionForType("income")).toBe(1);
    expect(signedTransactionAmount(500, 1)).toBe(500);
  });

  it("maps expense as negative effect via direction", () => {
    expect(defaultDirectionForType("expense")).toBe(-1);
    expect(signedTransactionAmount(500, -1)).toBe(-500);
  });

  it("rejects secure types in forms", () => {
    expect(isFormCreatableType("transfer_in")).toBe(false);
    expect(isFormCreatableType("balance_adjustment")).toBe(false);
    expect(isFormCreatableType("expense")).toBe(true);
  });
});

describe("createTransactionSchema", () => {
  it("accepts PKR expense", () => {
    const parsed = createTransactionSchema.parse({
      accountId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      type: "expense",
      amount: "1500",
      currency: "PKR",
      date: "2026-07-24",
      description: "Fuel",
      status: "cleared",
      classification: "personal",
    });
    expect(parsed.amount).toBe("1500");
  });

  it("requires exchange rate for USD", () => {
    expect(() =>
      createTransactionSchema.parse({
        accountId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        type: "income",
        amount: "100",
        currency: "USD",
        date: "2026-07-24",
        description: "Client",
        status: "cleared",
        classification: "business",
      })
    ).toThrow();
  });
});
