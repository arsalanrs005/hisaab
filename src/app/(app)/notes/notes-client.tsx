"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pin } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/layout/page-header";
import { createNoteAction, updateNoteAction } from "@/data/notes/mutations";
import type { NotesPageData, UiNote } from "@/data/notes/types";
import { formatDate, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export function NotesClient({ folders, notes }: NotesPageData) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [folderId, setFolderId] = useState(folders[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState<string>(
    notes.find((n) => n.folderId === folders[0]?.id)?.id ?? notes[0]?.id ?? ""
  );
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    notes.forEach((n) => n.checklist.forEach((c) => (map[c.id] = c.done)));
    return map;
  });

  const folderNotes = useMemo(
    () => notes.filter((n) => n.folderId === folderId),
    [notes, folderId]
  );

  const selected: UiNote | undefined =
    notes.find((n) => n.id === selectedId) ?? folderNotes[0] ?? notes[0];

  const pinned = notes.filter((n) => n.pinned);

  function selectFolder(id: string) {
    setFolderId(id);
    const first = notes.find((n) => n.folderId === id);
    if (first) setSelectedId(first.id);
  }

  async function handleCreateNote() {
    startTransition(async () => {
      const result = await createNoteAction({
        title: "Untitled note",
        folderId: folderId || null,
        body: "",
        visibility: "shared",
        checklist: [],
        tags: [],
      });
      setSelectedId(result.noteId);
      router.refresh();
    });
  }

  async function saveNote(patch: {
    title?: string;
    body?: string;
    checklist?: UiNote["checklist"];
  }) {
    if (!selected) return;
    startTransition(async () => {
      await updateNoteAction({
        id: selected.id,
        ...patch,
        checklist: patch.checklist ?? selected.checklist.map((item) => ({
          ...item,
          done: checklist[item.id] ?? item.done,
        })),
      });
      router.refresh();
    });
  }

  if (folders.length === 0) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader title="Notes & plans" description="Financial planning workspace." />
        <EmptyState
          title="No folders yet"
          description="Note folders will appear after workspace setup completes."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Notes & plans"
        description="A calm workspace for financial decisions, house and car plans, and Ops5ive strategy."
      >
        <Button onClick={handleCreateNote} disabled={pending}>
          New note
        </Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[220px_240px_minmax(0,1fr)]">
        <aside className="rounded-[12px] border border-border bg-card p-3">
          <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Folders
          </p>
          <ul className="space-y-0.5">
            {folders.map((folder) => (
              <li key={folder.id}>
                <button
                  type="button"
                  onClick={() => selectFolder(folder.id)}
                  className={cn(
                    "w-full rounded-[8px] px-2.5 py-2 text-left text-sm",
                    folderId === folder.id
                      ? "bg-muted font-medium"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {folder.name}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="space-y-4">
          <div className="rounded-[12px] border border-border bg-card p-3">
            <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Notes
            </p>
            <ul className="space-y-1">
              {folderNotes.map((note) => (
                <li key={note.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(note.id)}
                    className={cn(
                      "w-full rounded-[8px] px-2.5 py-2 text-left",
                      selected?.id === note.id ? "bg-muted" : "hover:bg-muted/50"
                    )}
                  >
                    <p className="truncate text-sm font-medium">{note.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {formatRelative(note.updatedAt)}
                    </p>
                  </button>
                </li>
              ))}
              {folderNotes.length === 0 ? (
                <p className="px-2 py-4 text-sm text-muted-foreground">No notes in this folder.</p>
              ) : null}
            </ul>
          </div>

          {pinned.length > 0 ? (
            <div className="rounded-[12px] border border-border bg-card p-3">
              <p className="mb-2 flex items-center gap-1 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <Pin className="h-3 w-3" /> Pinned
              </p>
              <ul className="space-y-1">
                {pinned.map((note) => (
                  <li key={note.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (note.folderId) setFolderId(note.folderId);
                        setSelectedId(note.id);
                      }}
                      className="w-full rounded-[8px] px-2.5 py-2 text-left text-sm hover:bg-muted/50"
                    >
                      {note.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {selected ? (
          <article className="min-w-0 rounded-[12px] border border-border bg-card p-5 sm:p-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <Input
                  key={`${selected.id}-title`}
                  defaultValue={selected.title}
                  className="h-auto border-0 bg-transparent px-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
                  aria-label="Note title"
                  onBlur={(e) => {
                    if (e.target.value !== selected.title) {
                      void saveNote({ title: e.target.value });
                    }
                  }}
                />
                <div className="flex flex-wrap gap-1.5">
                  {selected.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                  {selected.priority ? (
                    <Badge variant="outline" className="capitalize">
                      {selected.priority}
                    </Badge>
                  ) : null}
                  {selected.visibility === "personal" ? (
                    <Badge variant="outline">Personal</Badge>
                  ) : null}
                  {selected.pinned ? <Badge variant="default">Pinned</Badge> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selected.ownerName}
                  {selected.dueDate ? ` · Due ${formatDate(selected.dueDate)}` : ""}
                  {" · "}Updated {formatRelative(selected.updatedAt)}
                </p>
              </div>
            </div>

            <Textarea
              key={`${selected.id}-body`}
              defaultValue={selected.content}
              className="min-h-[280px] resize-y border-0 bg-transparent px-0 text-base leading-relaxed shadow-none focus-visible:ring-0"
              aria-label="Note content"
              onBlur={(e) => {
                if (e.target.value !== selected.content) {
                  void saveNote({ body: e.target.value });
                }
              }}
            />

            {selected.checklist.length > 0 ? (
              <div className="mt-6 space-y-2 border-t border-border pt-6">
                <p className="text-sm font-medium">Checklist</p>
                {selected.checklist.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checklist[item.id] ?? item.done}
                      onCheckedChange={(checked) => {
                        const next = { ...checklist, [item.id]: Boolean(checked) };
                        setChecklist(next);
                        void saveNote({
                          checklist: selected.checklist.map((row) => ({
                            ...row,
                            done: next[row.id] ?? row.done,
                          })),
                        });
                      }}
                    />
                    <span
                      className={cn(
                        checklist[item.id] ?? item.done
                          ? "text-muted-foreground line-through"
                          : ""
                      )}
                    >
                      {item.text}
                    </span>
                  </label>
                ))}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-6 text-sm text-muted-foreground">
              {selected.relatedGoalId ? (
                <span>
                  Goal:{" "}
                  <a href={`/goals/${selected.relatedGoalId}`} className="text-primary hover:underline">
                    Linked goal
                  </a>
                </span>
              ) : null}
              {selected.relatedAccountId ? (
                <span>
                  Account:{" "}
                  <a
                    href={`/accounts/${selected.relatedAccountId}`}
                    className="text-primary hover:underline"
                  >
                    Linked account
                  </a>
                </span>
              ) : null}
            </div>
          </article>
        ) : (
          <EmptyState
            title="No notes yet"
            description="Create a note to start planning in this folder."
            actionLabel="New note"
            onAction={handleCreateNote}
          />
        )}
      </div>
    </div>
  );
}
