import Link from "next/link";
import { Globe, Layers } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { VideoThumb } from "./video-thumb";
import { timeAgo } from "@/lib/utils";
import type { Video } from "@/lib/types";

function displayName(video: Video) {
  if (video.original_filename) return video.original_filename;
  const base = video.s3_key.split("/").pop() ?? video.s3_key;
  return base.replace(/^video-/, "");
}

export function VideoCard({ video }: { video: Video }) {
  const ready = video.status === "transcoded";
  const renditions = video.transcoded_urls?.length ?? 0;

  const inner = (
    <div className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-faint">
      <VideoThumb videoId={video.video_id} ready={ready} showPlay={ready} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-ink" title={displayName(video)}>
            {displayName(video)}
          </p>
          <p className="mt-1 font-mono text-[11px] text-faint">{timeAgo(video.created_at)}</p>
        </div>
        <StatusBadge status={video.status} />
      </div>

      <div className="flex items-center gap-3 font-mono text-[11px] text-muted">
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
      </div>
    </div>
  );

  if (ready) {
    return (
      <Link href={`/watch/${video.video_id}`} aria-label="Open video">
        {inner}
      </Link>
    );
  }
  return inner;
}
