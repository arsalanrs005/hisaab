"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  children?: React.ReactNode;
  savedFilters?: { id: string; label: string; active?: boolean }[];
  onSavedFilterClick?: (id: string) => void;
  onClear?: () => void;
  className?: string;
}

export function FilterBar({
  search,
  onSearchChange,
  children,
  savedFilters,
  onSavedFilterClick,
  onClear,
  className,
}: FilterBarProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search…"
            className="pl-9"
            aria-label="Search"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
        {onClear ? (
          <Button variant="ghost" size="sm" onClick={onClear} className="gap-1">
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        ) : null}
      </div>
      {savedFilters && savedFilters.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {savedFilters.map((f) => (
            <button key={f.id} type="button" onClick={() => onSavedFilterClick?.(f.id)}>
              <Badge variant={f.active ? "default" : "outline"} className="cursor-pointer">
                {f.label}
              </Badge>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
