import type { Account, Goal, User } from "@/types";
import type { AccountCapabilities } from "@/lib/finance/capabilities";
import {
  buildAccountCapabilities,
  getAccountPermissionLabel as getCapabilitiesLabel,
} from "@/lib/finance/capabilities";

/** @deprecated Prefer account.capabilities from live data layer */
export function canEditAccount(user: User, account: Account): boolean {
  return account.ownerId === user.id;
}

export function canEditAccountWithCapabilities(capabilities: AccountCapabilities): boolean {
  return capabilities.canCreateTransactions;
}

export { buildAccountCapabilities, getCapabilitiesLabel as getAccountPermissionLabel };

export function canEditGoal(user: User, goal: Goal): boolean {
  if (goal.visibility === "shared" || goal.visibility === "business") return true;
  return goal.ownerId === user.id;
}

export function canTransferInto(): boolean {
  return true;
}

export function canManageShared(): boolean {
  return true;
}
