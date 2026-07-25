import type { Tables, NotificationTypeDb } from "@/types/database";

export type NotificationRow = Tables<"notifications">;

export interface UiNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationTypeDb;
  read: boolean;
  createdAt: string;
  href?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export function mapNotificationToUi(row: NotificationRow): UiNotification {
  let href: string | undefined;
  if (row.related_entity_type === "transfer" && row.related_entity_id) {
    href = `/transfers?detail=${row.related_entity_id}`;
  } else if (row.related_entity_type === "balance_adjustment" && row.related_entity_id) {
    href = `/transactions?adjustment=${row.related_entity_id}`;
  } else if (row.related_entity_type === "transaction") {
    href = "/transactions";
  }

  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    read: Boolean(row.read_at),
    createdAt: row.created_at,
    href,
    relatedEntityType: row.related_entity_type ?? undefined,
    relatedEntityId: row.related_entity_id ?? undefined,
  };
}
