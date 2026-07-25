import type { GoalPriority } from "@/types";
import type { NoteVisibilityDb } from "@/types/database";

export interface NoteChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface NoteContentJson {
  body: string;
  checklist: NoteChecklistItem[];
  tags?: string[];
}

export interface UiNoteFolder {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  icon: string;
}

export interface UiNote {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  ownerProfileId: string | null;
  ownerName: string;
  visibility: NoteVisibilityDb;
  tags: string[];
  priority: GoalPriority | null;
  pinned: boolean;
  dueDate?: string;
  checklist: NoteChecklistItem[];
  relatedGoalId?: string;
  relatedAccountId?: string;
  relatedTransactionId?: string;
  relatedBusinessRecordType?: string;
  relatedBusinessRecordId?: string;
  updatedAt: string;
  createdAt: string;
}

export interface NotesPageData {
  folders: UiNoteFolder[];
  notes: UiNote[];
  currentProfileId: string;
}

export interface NoteFilters {
  folderId?: string;
  search?: string;
  includeArchived?: boolean;
}
