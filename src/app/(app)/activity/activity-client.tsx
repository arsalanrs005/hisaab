"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/format";
import type { getAuditLogs } from "@/data/audit/queries";

type ActivityResult = Awaited<ReturnType<typeof getAuditLogs>>;

export function ActivityClient({ result }: { result: ActivityResult }) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Activity"
        description="Append-only audit history for transfers, reconciliations, and ledger changes."
      />

      <div className="space-y-2">
        {result.events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          result.events.map((event) => (
            <div key={event.id} className="rounded-[12px] border border-border bg-card p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{event.summary}</p>
                    <Badge variant="outline">{event.action}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {event.actorName} · {formatRelative(event.createdAt)}
                  </p>
                </div>
                {event.href ? (
                  <Link href={event.href} className="text-sm text-primary hover:underline">
                    View
                  </Link>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
