import type { Tables } from "@/types/database";

export interface AccountCapabilities {
  canView: boolean;
  canCreateTransactions: boolean;
  canEditTransactions: boolean;
  canArchiveTransactions: boolean;
  canReconcile: boolean;
  canTransferOut: boolean;
  canReceiveTransfer: boolean;
  isOwner: boolean;
  isReadOnly: boolean;
  isSharedSavings: boolean;
}

export function buildAccountCapabilities(
  accountOwnerProfileId: string,
  currentProfileId: string,
  isSharedSavingsAccount: boolean,
  isActive: boolean,
  permission?: Pick<
    Tables<"account_permissions">,
    | "can_view"
    | "can_create_transactions"
    | "can_edit_transactions"
    | "can_archive_transactions"
    | "can_reconcile"
  > | null
): AccountCapabilities {
  const isOwner = accountOwnerProfileId === currentProfileId;
  const canView = permission?.can_view ?? true;
  const canCreate = permission?.can_create_transactions ?? isOwner;
  const canEdit = permission?.can_edit_transactions ?? isOwner;
  const canArchive = permission?.can_archive_transactions ?? isOwner;
  const canReconcile = (permission?.can_reconcile ?? isOwner) && isOwner;

  return {
    canView,
    canCreateTransactions: canCreate && isActive,
    canEditTransactions: canEdit,
    canArchiveTransactions: canArchive,
    canReconcile: canReconcile && isActive,
    canTransferOut: isOwner && isActive,
    canReceiveTransfer: isActive,
    isOwner,
    isReadOnly: !isOwner,
    isSharedSavings: isSharedSavingsAccount,
  };
}

export function getAccountPermissionLabel(
  capabilities: AccountCapabilities
): "Owner" | "View only" {
  return capabilities.isOwner ? "Owner" : "View only";
}
