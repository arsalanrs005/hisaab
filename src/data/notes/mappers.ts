import type { GoalPriority } from "@/types";
import type { ProfileSummary } from "@/data/profiles/helpers";
import type { Tables } from "@/types/database";
import type { NoteContentJson, UiNote, UiNoteFolder } from "@/data/notes/types";

const FOLDER_ICONS: Record<string, string> = {
  "shared-quick-notes": "zap",
  "financial-plans": "landmark",
  "spending-decisions": "wallet",
  "house-plan": "home",
  "car-plan": "car",
  "loan-notes": "file-text",
  "ops5ive-strategy": "briefcase",
  "upwork-plan": "globe",
  "linkedin-plan": "linkedin",
  "client-notes": "users",
  "monthly-reviews": "calendar",
};

function priorityFromDb(value: number | null): GoalPriority | null {
  if (value == null) return null;
  if (value <= 2) return "high";
  if (value <= 3) return "medium";
  return "low";
}

function priorityToDb(value: GoalPriority | null | undefined): number | null {
  if (!value) return null;
  if (value === "high") return 1;
  if (value === "medium") return 3;
  return 5;
}

export function parseNoteContent(raw: unknown): NoteContentJson {
  if (!raw || typeof raw !== "object") {
    return { body: "", checklist: [], tags: [] };
  }
  const obj = raw as Partial<NoteContentJson>;
  return {
    body: typeof obj.body === "string" ? obj.body : "",
    checklist: Array.isArray(obj.checklist)
      ? obj.checklist
          .filter((item): item is NoteContentJson["checklist"][number] =>
            Boolean(item && typeof item === "object" && "id" in item && "text" in item)
          )
          .map((item) => ({
            id: String(item.id),
            text: String(item.text),
            done: Boolean(item.done),
          }))
      : [],
    tags: Array.isArray(obj.tags) ? obj.tags.map(String) : [],
  };
}

export function buildNoteContentJson(input: {
  body: string;
  checklist?: NoteContentJson["checklist"];
  tags?: string[];
}): NoteContentJson {
  return {
    body: input.body,
    checklist: input.checklist ?? [],
    tags: input.tags ?? [],
  };
}

export function plainTextFromContent(content: NoteContentJson): string {
  const checklistText = content.checklist.map((item) => item.text).join(" ");
  return [content.body, checklistText, ...(content.tags ?? [])].join("\n").trim();
}

export function mapNoteFolderToUi(row: Tables<"note_folders">): UiNoteFolder {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sortOrder: row.sort_order,
    icon: FOLDER_ICONS[row.slug] ?? "file-text",
  };
}

export function mapNoteToUi(
  row: Tables<"notes">,
  profiles: ProfileSummary[]
): UiNote {
  const content = parseNoteContent(row.content_json);
  const owner = profiles.find((p) => p.id === (row.owner_profile_id ?? row.created_by));

  return {
    id: row.id,
    title: row.title,
    content: content.body,
    folderId: row.folder_id,
    ownerProfileId: row.owner_profile_id,
    ownerName: owner?.display_name ?? "Unknown",
    visibility: row.visibility,
    tags: content.tags ?? [],
    priority: priorityFromDb(row.priority),
    pinned: row.is_pinned,
    dueDate: row.due_date ?? undefined,
    checklist: content.checklist,
    relatedGoalId: row.related_goal_id ?? undefined,
    relatedAccountId: row.related_account_id ?? undefined,
    relatedTransactionId: row.related_transaction_id ?? undefined,
    relatedBusinessRecordType: row.related_business_record_type ?? undefined,
    relatedBusinessRecordId: row.related_business_record_id ?? undefined,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

export { priorityToDb };
