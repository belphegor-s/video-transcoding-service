"use client";

import { Check, ChevronRight, Clock, Folder, FolderOpen, Layers } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import type { FolderSummary } from "@/lib/types";

export function FolderCard({
  name,
  path,
  summary,
  view = "grid",
  selected = false,
  selectionActive = false,
  onOpen,
  onToggleSelect,
  onContextMenu,
}: {
  name: string;
  path: string;
  summary?: FolderSummary;
  view?: "grid" | "list";
  selected?: boolean;
  selectionActive?: boolean;
  onOpen: (path: string) => void;
  onToggleSelect?: (path: string) => void;
  onContextMenu?: (e: React.MouseEvent, path: string, name: string) => void;
}) {
  const handleClick = () => {
    if (selectionActive) onToggleSelect?.(path);
    else onOpen(path);
  };

  const videos = summary?.videos ?? 0;
  const subfolders = summary?.subfolders ?? 0;
  const empty = !!summary && videos === 0 && subfolders === 0;

  const checkbox = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggleSelect?.(path);
      }}
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all",
        selected
          ? "border-accent bg-accent text-accent-ink"
          : "border-border bg-bg/70 text-transparent opacity-0 backdrop-blur group-hover:opacity-100",
        selectionActive && "opacity-100",
      )}
      aria-label={selected ? "Deselect" : "Select"}
    >
      <Check className="h-4 w-4" />
    </button>
  );

  // Counts read as the folder's contents; the timestamp lives beside them.
  const counts = (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted">
      {empty ? (
        <span className="text-faint">Empty</span>
      ) : (
        <>
          {videos > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-accent" />
              {videos} video{videos > 1 ? "s" : ""}
            </span>
          )}
          {subfolders > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1.5">
              <Folder className="h-3.5 w-3.5" />
              {subfolders} folder{subfolders > 1 ? "s" : ""}
            </span>
          )}
        </>
      )}
      {summary?.updated_at && (
        <span
          className="inline-flex min-w-0 shrink items-center gap-1.5 text-faint"
          title={new Date(summary.updated_at).toLocaleString()}
        >
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{timeAgo(summary.updated_at)}</span>
        </span>
      )}
    </div>
  );

  if (view === "list") {
    return (
      <div
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu?.(e, path, name)}
        className={cn(
          "group flex cursor-pointer select-none items-center gap-4 rounded-xl border bg-surface p-3 text-left transition-colors",
          selected ? "border-accent ring-1 ring-accent" : "border-border hover:border-faint",
        )}
      >
        {checkbox}
        <div className="relative flex aspect-video w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-2 sm:w-32">
          <GridWash />
          <Folder className="relative h-7 w-7 text-accent transition-opacity duration-200 group-hover:opacity-0" strokeWidth={1.5} />
          <FolderOpen
            className="absolute h-7 w-7 text-accent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            strokeWidth={1.5}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-ink" title={name}>
            {name}
          </p>
          <div className="mt-1">{counts}</div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" />
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onContextMenu={(e) => onContextMenu?.(e, path, name)}
      className={cn(
        "group relative flex cursor-pointer select-none flex-col gap-4 rounded-2xl border bg-surface p-5 text-left transition-colors",
        selected ? "border-accent ring-1 ring-accent" : "border-border hover:border-faint",
      )}
    >
      <div className="absolute left-3 top-3 z-10">{checkbox}</div>

      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-2">
        <GridWash />
        <Folder
          className="relative h-16 w-16 text-accent transition-all duration-300 group-hover:scale-110 group-hover:opacity-0"
          strokeWidth={1.5}
        />
        <FolderOpen
          className="absolute h-16 w-16 scale-90 text-accent opacity-0 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100"
          strokeWidth={1.5}
        />
      </div>

      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm text-ink" title={name}>
            {name}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" />
        </div>
        <div className="mt-1.5">{counts}</div>
      </div>
    </div>
  );
}

function GridWash() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 opacity-[0.07]"
      style={{
        backgroundImage:
          "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    />
  );
}
