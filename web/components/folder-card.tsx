"use client";

import { ChevronRight, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

export function FolderCard({
  name,
  path,
  view = "grid",
  onOpen,
}: {
  name: string;
  path: string;
  view?: "grid" | "list";
  onOpen: (path: string) => void;
}) {
  if (view === "list") {
    return (
      <button
        onClick={() => onOpen(path)}
        className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:border-faint"
      >
        <div className="flex h-12 w-24 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 sm:w-32">
          <Folder className="h-5 w-5 text-accent" />
        </div>
        <span className="min-w-0 flex-1 truncate text-sm text-ink">{name}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" />
      </button>
    );
  }

  return (
    <button
      onClick={() => onOpen(path)}
      className="group flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 text-left transition-colors hover:border-faint"
    >
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-2">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <Folder className="relative h-10 w-10 text-accent transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm text-ink" title={name}>
          {name}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}
