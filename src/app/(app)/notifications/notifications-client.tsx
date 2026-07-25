"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/format";
import type { UiNotification } from "@/data/notifications/mappers";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/data/notifications/mutations";
import { cn } from "@/lib/utils";

const typeVariant = {
  transfer: "default",
  reconciliation: "secondary",
  transaction: "outline",
  budget: "outline",
  goal: "outline",
  income: "outline",
  loan: "outline",
  system: "secondary",
} as const;

export function NotificationsClient({
  initialNotifications,
}: {
  initialNotifications: UiNotification[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialNotifications);

  async function markAllRead() {
    await markAllNotificationsReadAction();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    router.refresh();
  }

  async function toggleRead(item: UiNotification) {
    if (!item.read) {
      await markNotificationReadAction(item.id);
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      router.refresh();
    }
  }

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Notifications"
        description={`${unread} unread · in-app alerts for transfers and reconciliations.`}
      >
        <Button variant="outline" onClick={() => void markAllRead()} disabled={unread === 0}>
          Mark all read
        </Button>
      </PageHeader>

      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              className={cn(
                "rounded-[12px] border border-border bg-card p-4",
                !n.read && "border-primary/30 bg-accent/40"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{n.title}</p>
                    <Badge variant={typeVariant[n.type] ?? "outline"} className="capitalize">
                      {n.type}
                    </Badge>
                    {!n.read ? <Badge variant="default">New</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelative(n.createdAt)}
                    {n.href ? (
                      <>
                        {" · "}
                        <Link href={n.href} className="text-primary hover:underline">
                          Open
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => void toggleRead(n)}>
                  {n.read ? "Unread" : "Mark read"}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
