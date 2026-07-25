"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import { requireCurrentWorkspace } from "@/data/workspaces/queries";
import { mapDatabaseError } from "@/data/errors";
import {
  buildNoteContentJson,
  plainTextFromContent,
  priorityToDb,
} from "@/data/notes/mappers";
import { createNoteSchema, updateNoteSchema, type CreateNoteInput, type UpdateNoteInput } from "@/data/notes/validation";
import type { Json, TablesUpdate } from "@/types/database";

function revalidateNotesPaths() {
  revalidatePath("/notes");
}

export async function createNoteAction(raw: CreateNoteInput) {
  const profile = await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const input = createNoteSchema.parse(raw);
  const content = buildNoteContentJson({
    body: input.body ?? "",
    checklist: input.checklist,
    tags: input.tags,
  });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .insert({
      workspace_id: workspace.workspaceId,
      folder_id: input.folderId ?? null,
      title: input.title,
      content_json: content as unknown as Json,
      plain_text: plainTextFromContent(content),
      owner_profile_id: input.visibility === "personal" ? profile.id : null,
      visibility: input.visibility,
      priority: priorityToDb(input.priority),
      due_date: input.dueDate ?? null,
      related_account_id: input.relatedAccountId ?? null,
      related_transaction_id: input.relatedTransactionId ?? null,
      related_goal_id: input.relatedGoalId ?? null,
      related_loan_id: input.relatedLoanId ?? null,
      created_by: profile.id,
      updated_by: profile.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  revalidateNotesPaths();
  return { ok: true as const, noteId: data.id };
}

export async function updateNoteAction(raw: UpdateNoteInput) {
  const profile = await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const input = updateNoteSchema.parse(raw);

  const supabase = await createClient();
  const updates: TablesUpdate<"notes"> = {
    updated_by: profile.id,
  };

  if (input.title !== undefined) updates.title = input.title;
  if (input.folderId !== undefined) updates.folder_id = input.folderId;
  if (input.visibility !== undefined) {
    updates.visibility = input.visibility;
    updates.owner_profile_id = input.visibility === "personal" ? profile.id : null;
  }
  if (input.priority !== undefined) updates.priority = priorityToDb(input.priority);
  if (input.dueDate !== undefined) updates.due_date = input.dueDate;
  if (input.relatedAccountId !== undefined) updates.related_account_id = input.relatedAccountId;
  if (input.relatedTransactionId !== undefined) {
    updates.related_transaction_id = input.relatedTransactionId;
  }
  if (input.relatedGoalId !== undefined) updates.related_goal_id = input.relatedGoalId;
  if (input.relatedLoanId !== undefined) updates.related_loan_id = input.relatedLoanId;

  if (
    input.body !== undefined ||
    input.checklist !== undefined ||
    input.tags !== undefined
  ) {
    const { data: existing } = await supabase
      .from("notes")
      .select("content_json")
      .eq("id", input.id)
      .eq("workspace_id", workspace.workspaceId)
      .maybeSingle();

    const prior = existing?.content_json as { body?: string; checklist?: unknown; tags?: string[] } | null;
    const content = buildNoteContentJson({
      body: input.body ?? prior?.body ?? "",
      checklist: input.checklist ?? (Array.isArray(prior?.checklist) ? prior.checklist as never : []),
      tags: input.tags ?? prior?.tags ?? [],
    });
    updates.content_json = content as unknown as Json;
    updates.plain_text = plainTextFromContent(content);
  }

  const { error } = await supabase
    .from("notes")
    .update(updates)
    .eq("id", input.id)
    .eq("workspace_id", workspace.workspaceId);

  if (error) throw new Error(mapDatabaseError(error));
  revalidateNotesPaths();
  return { ok: true as const };
}

export async function archiveNoteAction(noteId: string) {
  await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notes")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", noteId)
    .eq("workspace_id", workspace.workspaceId);

  if (error) throw new Error(mapDatabaseError(error));
  revalidateNotesPaths();
  return { ok: true as const };
}

export async function pinNoteAction(noteId: string, pinned: boolean) {
  await requireCurrentProfile();
  const workspace = await requireCurrentWorkspace();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notes")
    .update({ is_pinned: pinned })
    .eq("id", noteId)
    .eq("workspace_id", workspace.workspaceId);

  if (error) throw new Error(mapDatabaseError(error));
  revalidateNotesPaths();
  return { ok: true as const };
}
