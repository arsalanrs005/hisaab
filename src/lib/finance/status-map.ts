import type { TransactionStatusDb, TransactionTypeDb } from "@/types/database";
import type { TransactionStatus, TransactionType } from "@/types";

export function dbStatusToUi(status: TransactionStatusDb): TransactionStatus {
  switch (status) {
    case "completed":
      return "cleared";
    case "pending":
      return "pending";
    case "expected":
      return "expected";
    case "cancelled":
      return "cancelled";
  }
}

export function uiStatusToDb(status: TransactionStatus): TransactionStatusDb {
  switch (status) {
    case "cleared":
      return "completed";
    case "pending":
      return "pending";
    case "expected":
      return "expected";
    case "cancelled":
      return "cancelled";
  }
}

export function dbTypeToUi(type: TransactionTypeDb): TransactionType {
  switch (type) {
    case "transfer_in":
    case "transfer_out":
      return "transfer";
    default:
      return type as TransactionType;
  }
}

export function uiTypeToDb(type: TransactionType): TransactionTypeDb {
  if (type === "transfer") {
    throw new Error("Transfer transactions cannot be created through normal forms");
  }
  return type as TransactionTypeDb;
}
