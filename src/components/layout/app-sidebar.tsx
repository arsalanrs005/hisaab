"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, Check } from "lucide-react";
import { navGroups } from "@/lib/navigation";
import { signOut } from "@/lib/auth/actions";
import { useApp } from "@/providers/app-provider";
import { devPreviewUsers } from "@/lib/auth/dev-users";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { WorkspaceContext } from "@/data/workspaces/types";

function HisabLogo({ collapsed, workspaceName }: { collapsed?: boolean; workspaceName?: string }) {
  return (
    <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]">
        H
      </div>
      {!collapsed ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">Hisab</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {workspaceName ?? "Private workspace"}
          </p>
        </div>
      ) : null}
    </Link>
  );
}

export function AppSidebar({
  initialWorkspace = null,
  initialUnreadCount = 0,
}: {
  initialWorkspace?: WorkspaceContext | null;
  initialUnreadCount?: number;
}) {
  const pathname = usePathname();
  const {
    sidebarCollapsed,
    toggleSidebar,
    currentUser,
    setCurrentUserId,
    isDevUserSwitcherEnabled,
    setMobileMenuOpen,
  } = useApp();
  const unread = initialUnreadCount;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground backdrop-blur-[var(--glass-blur)] transition-[width] duration-[var(--duration-normal)] ease-[var(--ease-out)] lg:flex",
        sidebarCollapsed ? "w-[var(--sidebar-collapsed)]" : "w-[var(--sidebar-width)]"
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border px-3",
          sidebarCollapsed ? "justify-center" : "justify-between gap-2"
        )}
      >
        <HisabLogo collapsed={sidebarCollapsed} workspaceName={initialWorkspace?.name} />
        {!sidebarCollapsed ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {!sidebarCollapsed ? (
        <div className="border-b border-sidebar-border px-3 py-3">
          <WorkspaceSwitcher workspace={initialWorkspace} />
        </div>
      ) : null}

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Main">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            {!sidebarCollapsed ? (
              <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={item.title}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors duration-[var(--duration-normal)]",
                        sidebarCollapsed && "justify-center px-0",
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                          : "text-foreground-muted hover:bg-[var(--surface-hover)] hover:text-foreground"
                      )}
                    >
                      {active && !sidebarCollapsed ? (
                        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                      ) : null}
                      <Icon className="h-4 w-4 shrink-0" />
                      {!sidebarCollapsed ? <span className="truncate">{item.title}</span> : null}
                      {!sidebarCollapsed && item.href === "/notifications" && unread > 0 ? (
                        <Badge variant="default" className="ml-auto h-5 min-w-5 justify-center px-1.5">
                          {unread}
                        </Badge>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {sidebarCollapsed ? (
          <Button
            variant="ghost"
            size="icon"
            className="w-full"
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2.5 rounded-[10px] px-2 py-2 text-left hover:bg-sidebar-accent">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: currentUser.avatarColor }}
                >
                  {currentUser.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{currentUser.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{currentUser.email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {isDevUserSwitcherEnabled ? (
                <>
                  <DropdownMenuLabel>Dev preview user</DropdownMenuLabel>
                  {devPreviewUsers.map((u) => (
                    <DropdownMenuItem key={u.id} onClick={() => setCurrentUserId(u.id)}>
                      <span className="flex-1">{u.name}</span>
                      {currentUser.id === u.id ? <Check className="h-4 w-4" /> : null}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              ) : (
                <DropdownMenuLabel>Signed in as {currentUser.name}</DropdownMenuLabel>
              )}
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  void signOut();
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </aside>
  );
}

export function WorkspaceSwitcher({ workspace }: { workspace?: WorkspaceContext | null }) {
  if (!workspace) {
    return (
      <div className="rounded-[10px] border border-sidebar-border bg-card px-3 py-2">
        <p className="text-[11px] text-muted-foreground">Workspace</p>
        <p className="text-sm font-medium">Loading…</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--surface)] px-3 py-2.5 backdrop-blur-[var(--glass-blur)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-foreground-faint">Workspace</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{workspace.name}</p>
      <p className="text-xs text-foreground-muted">
        {workspace.type === "shared" ? "Shared · household" : "Personal · private"}
      </p>
    </div>
  );
}
