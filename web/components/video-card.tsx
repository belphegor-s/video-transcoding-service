"use client";

import { Check, Folder, Globe, Layers } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { VideoThumb } from "./video-thumb";
import { timeAgo, cn } from "@/lib/utils";
import type { Video } from "@/lib/types";

function displayName(video: Video) {
  if (video.original_filename) return video.original_filename;
  const base = video.s3_key.split("/").pop() ?? video.s3_key;
  return base.replace(/^video-/, "");
}

export function VideoCard({
  video,
  selected,
  selectionActive,
  view = "grid",
  onOpen,
  onToggleSelect,
  onContextMenu,
}: {
  video: Video;
  selected: boolean;
  selectionActive: boolean;
  view?: "grid" | "list";
  onOpen: (v: Video) => void;
  onToggleSelect: (v: Video) => void;
  onContextMenu: (e: React.MouseEvent, v: Video) => void;
}) {
  const ready = video.status === "transcoded";
  const renditions = video.transcoded_urls?.length ?? 0;

  const handleClick = () => {
    if (selectionActive) onToggleSelect(video);
    else if (ready) onOpen(video);
  };

  const checkbox = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggleSelect(video);
      }}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-md border transition-all",
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

  const meta = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted">
      {ready && renditions > 0 && (
        <span className="inline-flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-accent" />
          {renditions}
        </span>
      )}
      {video.is_public && (
        <span className="inline-flex items-center gap-1.5 text-accent">
          <Globe className="h-3.5 w-3.5" />
          Public
        </span>
      )}
    </div>
  );

  if (view === "list") {
    return (
      <div
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, video)}
        className={cn(
          "group flex cursor-pointer select-none items-center gap-4 rounded-xl border bg-surface p-3 transition-colors",
          selected ? "border-accent ring-1 ring-accent" : "border-border hover:border-faint",
        )}
      >
        {checkbox}
        <div className="w-24 shrink-0 sm:w-32">
          <VideoThumb videoId={video.video_id} ready={ready} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-ink" title={displayName(video)}>
            {displayName(video)}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-faint">{timeAgo(video.created_at)}</p>
        </div>
        <div className="hidden sm:block">{meta}</div>
        <StatusBadge status={video.status} />
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onContextMenu={(e) => onContextMenu(e, video)}
      className={cn(
        "group relative flex cursor-pointer select-none flex-col gap-4 overflow-hidden rounded-2xl border bg-surface p-5 transition-colors",
        selected ? "border-accent ring-1 ring-accent" : "border-border hover:border-faint",
      )}
    >
      <div className="absolute left-3 top-3 z-10">{checkbox}</div>

      <VideoThumb videoId={video.video_id} ready={ready} showPlay={ready && !selectionActive} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-ink" title={displayName(video)}>
            {displayName(video)}
          </p>
          <p className="mt-1 font-mono text-[11px] text-faint">{timeAgo(video.created_at)}</p>
        </div>
        <StatusBadge status={video.status} />
      </div>

      <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-muted">
        {ready && renditions > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-accent" />
            {renditions} rendition{renditions > 1 ? "s" : ""}
          </span>
        )}
        {video.is_public && (
          <span className="inline-flex items-center gap-1.5 text-accent">
            <Globe className="h-3.5 w-3.5" />
            Public
          </span>
        )}
        {video.folder && (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Folder className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{video.folder}</span>
          </span>
        )}
      </div>
    </div>
  );
}
