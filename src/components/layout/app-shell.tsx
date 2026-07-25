"use client";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { QuickAddTransaction } from "@/components/forms/quick-add-transaction";
import { TransferDialog } from "@/components/forms/transfer-dialog";
import { BalanceReconciliationDialog } from "@/components/forms/balance-reconciliation-dialog";
import { useApp } from "@/providers/app-provider";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

import type { WorkspaceContext } from "@/data/workspaces/types";

export function AppShell({
  children,
  initialUnreadNotificationCount = 0,
  initialWorkspace = null,
}: {
  children: React.ReactNode;
  initialUnreadNotificationCount?: number;
  initialWorkspace?: WorkspaceContext | null;
}) {
  const { sidebarCollapsed } = useApp();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background">
        <AppSidebar
          initialWorkspace={initialWorkspace}
          initialUnreadCount={initialUnreadNotificationCount}
        />
        <div
          className={cn(
            "flex min-h-screen flex-col transition-[padding] duration-[var(--duration-normal)] ease-[var(--ease-out)]",
            sidebarCollapsed ? "lg:pl-[var(--sidebar-collapsed)]" : "lg:pl-[var(--sidebar-width)]"
          )}
        >
          <AppHeader initialUnreadCount={initialUnreadNotificationCount} />
          <main className="flex-1 px-4 py-5 pb-24 sm:px-6 sm:py-7 lg:px-9 lg:pb-8">
            <div className="page-container">{children}</div>
          </main>
        </div>
        <MobileNavigation />
        <QuickAddTransaction />
        <TransferDialog />
        <BalanceReconciliationDialog />
      </div>
    </TooltipProvider>
  );
}
