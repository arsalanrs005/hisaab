"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import { requireCurrentWorkspace } from "@/data/workspaces/queries";
import { mapDatabaseError } from "@/data/errors";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export async function createAttachmentUploadAction(input: {
  noteId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}) {
  const profile = await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  if (!ALLOWED_MIME.has(input.mimeType)) {
    throw new Error("Unsupported file type.");
  }
  if (input.fileSize <= 0 || input.fileSize > 10 * 1024 * 1024) {
    throw new Error("File must be between 1 byte and 10 MB.");
  }

  const supabase = await createClient();
  const { data: note, error: noteError } = await supabase
    .from("notes")
    .select("id")
    .eq("id", input.noteId)
    .eq("workspace_id", workspace.workspaceId)
    .is("archived_at", null)
    .maybeSingle();

  if (noteError || !note) throw new Error("Note not found.");

  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const storagePath = `${workspace.workspaceId}/${profile.id}/note/${input.noteId}/${Date.now()}-${safeName}`;

  const { data: attachment, error } = await (supabase as any)
    .from("attachments")
    .insert({
      workspace_id: workspace.workspaceId,
      storage_path: storagePath,
      file_name: input.fileName,
      mime_type: input.mimeType,
      file_size: input.fileSize,
      uploaded_by: profile.id,
      note_id: input.noteId,
    })
    .select("id, storage_path")
    .single();

  if (error) throw new Error(mapDatabaseError(error));

  const { data: signed, error: signError } = await supabase.storage
    .from("hisab-attachments")
    .createSignedUploadUrl(storagePath);

  if (signError || !signed) throw new Error("Unable to prepare upload.");

  revalidatePath("/notes");
  return {
    ok: true as const,
    attachmentId: attachment.id,
    storagePath: attachment.storage_path,
    signedUrl: signed.signedUrl,
    token: signed.token,
  };
}

export async function getAttachmentDownloadUrlAction(attachmentId: string) {
  await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from("attachments")
    .select("storage_path, file_name")
    .eq("id", attachmentId)
    .eq("workspace_id", workspace.workspaceId)
    .is("archived_at", null)
    .maybeSingle();

  if (error || !data) throw new Error("Attachment not found.");

  const { data: signed, error: signError } = await supabase.storage
    .from("hisab-attachments")
    .createSignedUrl(data.storage_path, 300);

  if (signError || !signed) throw new Error("Unable to create download link.");
  return { ok: true as const, url: signed.signedUrl, fileName: data.file_name };
}

export async function archiveAttachmentAction(attachmentId: string) {
  await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from("attachments")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", attachmentId)
    .eq("workspace_id", workspace.workspaceId);

  if (error) throw new Error(mapDatabaseError(error));
  revalidatePath("/notes");
  return { ok: true as const };
}
