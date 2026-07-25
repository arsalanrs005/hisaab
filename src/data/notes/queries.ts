import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile, getAllProfiles } from "@/data/profiles/queries";
import { requireCurrentWorkspace } from "@/data/workspaces/queries";
import { mapNoteFolderToUi, mapNoteToUi } from "@/data/notes/mappers";
import type { NoteFilters, NotesPageData, UiNote } from "@/data/notes/types";

export const dynamic = "force-dynamic";

const noteFilterSchema = z.object({
  folderId: z.string().uuid().optional(),
  search: z.string().optional(),
  includeArchived: z.boolean().optional(),
});

export async function getNoteFolders() {
  const workspace = await requireCurrentWorkspace();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("note_folders")
    .select("*")
    .eq("workspace_id", workspace.workspaceId)
    .is("archived_at", null)
    .order("sort_order");

  if (error) throw new Error("Unable to load note folders.");
  return (data ?? []).map(mapNoteFolderToUi);
}

export async function getNotes(rawFilters: NoteFilters = {}): Promise<UiNote[]> {
  await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const filters = noteFilterSchema.parse(rawFilters);
  const profiles = await getAllProfiles();
  const supabase = await createClient();

  let query = supabase
    .from("notes")
    .select("*")
    .eq("workspace_id", workspace.workspaceId)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (!filters.includeArchived) {
    query = query.is("archived_at", null);
  }
  if (filters.folderId) {
    query = query.eq("folder_id", filters.folderId);
  }
  if (filters.search?.trim()) {
    query = query.or(
      `title.ilike.%${filters.search.trim()}%,plain_text.ilike.%${filters.search.trim()}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error("Unable to load notes.");
  return (data ?? []).map((row) => mapNoteToUi(row, profiles));
}

export async function getNoteById(noteId: string): Promise<UiNote | null> {
  await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const profiles = await getAllProfiles();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("workspace_id", workspace.workspaceId)
    .eq("id", noteId)
    .is("archived_at", null)
    .maybeSingle();

  if (error) throw new Error("Unable to load note.");
  return data ? mapNoteToUi(data, profiles) : null;
}

export async function getNotesPageData(): Promise<NotesPageData> {
  const profile = await requireCurrentProfile();
  const [folders, notes] = await Promise.all([getNoteFolders(), getNotes()]);
  return {
    folders,
    notes,
    currentProfileId: profile.id,
  };
}
