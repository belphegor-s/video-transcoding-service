"use client";

import { Check, ChevronRight, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

export function FolderCard({
  name,
  path,
  view = "grid",
  selected = false,
  selectionActive = false,
  onOpen,
  onToggleSelect,
  onContextMenu,
}: {
  name: string;
  path: string;
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
        <div className="flex aspect-video w-24 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 sm:w-32">
          <Folder className="h-7 w-7 text-accent" />
        </div>
        <span className="min-w-0 flex-1 truncate text-sm text-ink">{name}</span>
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
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <Folder className="relative h-16 w-16 text-accent transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm text-ink" title={name}>
          {name}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  );
}
