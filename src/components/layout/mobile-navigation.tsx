"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mobilePrimaryNav } from "@/lib/navigation";
import { useApp } from "@/providers/app-provider";
import { cn } from "@/lib/utils";

export function MobileNavigation() {
  const pathname = usePathname();
  const { setMobileMenuOpen, setQuickAddOpen } = useApp();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--glass-border)] bg-[var(--surface)]/90 backdrop-blur-[var(--glass-blur)] lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary mobile"
    >
      <ul className="grid h-16 grid-cols-5">
        {mobilePrimaryNav.map((item) => {
          const Icon = item.icon;
          const isMore = item.href === "#more";
          const active =
            !isMore &&
            (pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href)));

          if (isMore) {
            return (
              <li key={item.title}>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-[10px] text-muted-foreground"
                >
                  <Icon className="h-5 w-5" />
                  More
                </button>
              </li>
            );
          }

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex h-full w-full flex-col items-center justify-center gap-0.5 text-[10px]",
                  active ? "text-primary font-medium" : "text-muted-foreground"
                )}
                onClick={(e) => {
                  if (item.title === "Activity") {
                    // keep default nav
                    void e;
                  }
                }}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => setQuickAddOpen(true)}
        className="sr-only"
        aria-hidden
      >
        Quick add
      </button>
    </nav>
  );
}
