import { z } from "zod";

const checklistItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(500),
  done: z.boolean(),
});

export const createNoteSchema = z.object({
  title: z.string().min(1).max(200),
  folderId: z.string().uuid().nullable().optional(),
  body: z.string().max(50000).optional().default(""),
  visibility: z.enum(["shared", "personal"]).default("shared"),
  priority: z.enum(["high", "medium", "low"]).nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  checklist: z.array(checklistItemSchema).optional().default([]),
  tags: z.array(z.string().max(50)).optional().default([]),
  relatedAccountId: z.string().uuid().nullable().optional(),
  relatedTransactionId: z.string().uuid().nullable().optional(),
  relatedGoalId: z.string().uuid().nullable().optional(),
  relatedLoanId: z.string().uuid().nullable().optional(),
});

export const updateNoteSchema = createNoteSchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
