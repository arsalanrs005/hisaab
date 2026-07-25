import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import { requireCurrentWorkspace } from "@/data/workspaces/queries";

export const dynamic = "force-dynamic";

export async function getNoteAttachments(noteId: string) {
  await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from("attachments")
    .select("id, file_name, mime_type, file_size, created_at")
    .eq("workspace_id", workspace.workspaceId)
    .eq("note_id", noteId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Unable to load attachments.");
  return data ?? [];
}
