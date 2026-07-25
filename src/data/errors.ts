export function mapDatabaseError(error: { message?: string; code?: string }): string {
  const message = error.message ?? "";

  if (message.includes("Direct insert of transfer") || message.includes("transfer_out")) {
    return "Transfer transactions must be created through the transfer workflow (Phase 4).";
  }
  if (message.includes("balance_adjustment")) {
    return "Balance adjustments must be created through reconciliation (Phase 4).";
  }
  if (message.includes("Insufficient funds")) {
    return "This account does not have enough completed funds for this transfer.";
  }
  if (message.includes("Only the source account owner")) {
    return "You can view this account, but only its owner can modify transactions.";
  }
  if (message.includes("Archive/restore must use")) {
    return "Use Archive or Restore instead of editing archived state directly.";
  }
  if (message.includes("duplicate key") || message.includes("accounts_owner_bank_name_unique")) {
    return "An account with this bank and name already exists.";
  }
  if (message.includes("JWT") || message.includes("not authenticated")) {
    return "Your session expired. Please sign in again.";
  }

  return "Something went wrong while saving. Please try again.";
}
