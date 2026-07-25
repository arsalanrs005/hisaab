"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Bell,
  Eye,
  EyeOff,
  Menu,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp, type DateRangePreset } from "@/providers/app-provider";
import { devPreviewUsers } from "@/lib/auth/dev-users";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { GlobalSearchDialog } from "@/components/layout/global-search-dialog";
import { navGroups } from "@/lib/navigation";
import { signOut } from "@/lib/auth/actions";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/accounts": "Accounts",
  "/transactions": "Transactions",
  "/transfers": "Transfers",
  "/goals": "Savings & goals",
  "/loans": "Loans",
  "/budget": "Budget",
  "/reports": "Reports",
  "/notes": "Notes & plans",
  "/ops5ive": "Ops5ive",
  "/ops5ive/upwork": "Upwork",
  "/ops5ive/linkedin": "LinkedIn",
  "/notifications": "Notifications",
  "/activity": "Activity",
  "/settings": "Settings",
};

export function AppHeader({ initialUnreadCount = 0 }: { initialUnreadCount?: number }) {
  const pathname = usePathname();
  const {
    hideBalances,
    toggleHideBalances,
    dashboardMode,
    setDashboardMode,
    dateRange,
    setDateRange,
    setQuickAddOpen,
    openTransfer,
    setMobileMenuOpen,
    mobileMenuOpen,
    currentUser,
    setCurrentUserId,
    isDevUserSwitcherEnabled,
  } = useApp();

  const [searchOpen, setSearchOpen] = React.useState(false);
  const unread = initialUnreadCount;
  const title =
    Object.entries(pageTitles).find(
      ([href]) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
    )?.[1] ?? "Hisab";

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[var(--header-height)] items-center gap-3 border-b border-[var(--glass-border)] bg-[var(--surface)]/80 px-4 backdrop-blur-[var(--glass-blur)] sm:px-6 lg:px-9">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold sm:text-base">{title}</p>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {pathname.startsWith("/dashboard") ? (
            <div
              className="inline-flex rounded-lg border border-[var(--glass-border)] bg-[var(--surface)] p-0.5 backdrop-blur-[var(--glass-blur)]"
              role="group"
              aria-label="Dashboard mode"
            >
              <button
                type="button"
                onClick={() => setDashboardMode("combined")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-[var(--duration-normal)]",
                  dashboardMode === "combined"
                    ? "bg-[var(--surface-raised)] text-foreground shadow-[var(--shadow-xs)]"
                    : "text-foreground-muted hover:text-foreground"
                )}
              >
                Combined
              </button>
              <button
                type="button"
                onClick={() => setDashboardMode("personal")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-[var(--duration-normal)]",
                  dashboardMode === "personal"
                    ? "bg-[var(--surface-raised)] text-foreground shadow-[var(--shadow-xs)]"
                    : "text-foreground-muted hover:text-foreground"
                )}
              >
                Personal
              </button>
            </div>
          ) : null}

          <Select
            value={dateRange}
            onValueChange={(v) => setDateRange(v as DateRangePreset)}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs" aria-label="Date range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This month</SelectItem>
              <SelectItem value="last_month">Last month</SelectItem>
              <SelectItem value="last_3_months">Last 3 months</SelectItem>
              <SelectItem value="year_to_date">Year to date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleHideBalances}
          aria-label={hideBalances ? "Show balances" : "Hide balances"}
        >
          {hideBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Search"
          className="hidden sm:inline-flex"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-4 w-4" />
        </Button>

        <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

        <Button variant="ghost" size="icon-sm" asChild className="relative">
          <Link href="/notifications" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            {unread > 0 ? (
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-danger" />
            ) : null}
          </Link>
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="hidden gap-1.5 sm:inline-flex"
          onClick={() => openTransfer()}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Transfer
        </Button>

        <Button size="sm" className="gap-1.5" onClick={() => setQuickAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="hidden h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white sm:flex"
              style={{ backgroundColor: currentUser.avatarColor }}
              aria-label="User menu"
            >
              {currentUser.initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Signed in as {currentUser.name}</DropdownMenuLabel>
            {isDevUserSwitcherEnabled ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Dev preview user
                </DropdownMenuLabel>
                {devPreviewUsers.map((u) => (
                  <DropdownMenuItem key={u.id} onClick={() => setCurrentUserId(u.id)}>
                    {u.name}
                    {currentUser.id === u.id ? (
                      <Badge variant="secondary" className="ml-auto">
                        Active
                      </Badge>
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </>
            ) : null}
            <DropdownMenuSeparator />
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
      </header>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="border-b border-border p-4 text-left">
            <SheetTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground">
                H
              </span>
              Hisab
            </SheetTitle>
          </SheetHeader>
          <nav className="overflow-y-auto p-3" aria-label="Mobile menu">
            {navGroups.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active =
                      pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-sm",
                            active
                              ? "bg-muted font-medium"
                              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
