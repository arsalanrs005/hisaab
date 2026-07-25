"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { globalSearchAction } from "@/data/search/mutations";
import type { SearchResult } from "@/data/search/types";

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [pending, setPending] = React.useState(false);
  const requestId = React.useRef(0);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const id = ++requestId.current;
    const timer = window.setTimeout(() => {
      setPending(true);
      void globalSearchAction(trimmed)
        .then((items) => {
          if (requestId.current === id) setResults(items);
        })
        .finally(() => {
          if (requestId.current === id) setPending(false);
        });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  function handleSelect(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 p-0">
        <DialogHeader className="border-b border-border px-4 py-3 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" />
            Search Hisab
          </DialogTitle>
          <DialogDescription className="sr-only">
            Search transactions, accounts, notes, goals, and clients.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-border px-4 py-3">
          <Input
            autoFocus
            placeholder="Search transactions, accounts, notes, goals…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="max-h-[360px] overflow-y-auto p-2">
          {query.trim().length < 2 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search.
            </p>
          ) : pending ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">No results found.</p>
          ) : (
            <ul className="space-y-1">
              {results.map((result) => (
                <li key={`${result.type}-${result.id}`}>
                  <button
                    type="button"
                    onClick={() => handleSelect(result.href)}
                    className="flex w-full items-start justify-between gap-3 rounded-[10px] px-3 py-2.5 text-left hover:bg-muted/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{result.title}</p>
                      {result.subtitle ? (
                        <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="shrink-0 capitalize">
                      {result.type}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          Press Esc to close. Select a result to navigate.
          {" · "}
          <Link href="/transactions" onClick={() => onOpenChange(false)}>
            Browse all transactions
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
