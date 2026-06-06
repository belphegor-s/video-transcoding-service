"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  total,
  limit,
  offset,
  onChange,
  noun = "items",
}: {
  total: number;
  limit: number;
  offset: number;
  onChange: (offset: number) => void;
  noun?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.floor(offset / limit) + 1;
  if (pages <= 1) return null;

  return (
    <div className="mt-8 flex items-center justify-between gap-4">
      <p className="font-mono text-[11px] text-faint">
        {total} {noun} · page {page} of {pages}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, offset - limit))}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-faint hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>
        <button
          onClick={() => onChange(offset + limit)}
          disabled={page >= pages}
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-faint hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
