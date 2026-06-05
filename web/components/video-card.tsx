import Link from "next/link";
import { Clapperboard, Layers, Play } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { timeAgo } from "@/lib/utils";
import type { Video } from "@/lib/types";

function fileLabel(s3_key: string) {
  const base = s3_key.split("/").pop() ?? s3_key;
  return base.replace(/^video-/, "");
}

export function VideoCard({ video }: { video: Video }) {
  const ready = video.status === "transcoded";
  const renditions = video.transcoded_urls?.length ?? 0;

  const inner = (
    <div className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-faint">
      {/* thumbnail-ish header */}
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-2">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {ready ? (
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-ink transition-transform duration-300 group-hover:scale-110">
            <Play className="h-5 w-5 translate-x-px fill-current" />
          </span>
        ) : (
          <Clapperboard className="relative h-8 w-8 text-faint" strokeWidth={1.5} />
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm text-ink">{fileLabel(video.s3_key)}</p>
          <p className="mt-1 font-mono text-[11px] text-faint">{timeAgo(video.created_at)}</p>
        </div>
        <StatusBadge status={video.status} />
      </div>

      {ready && renditions > 0 && (
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted">
          <Layers className="h-3.5 w-3.5 text-accent" />
          {renditions} rendition{renditions > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );

  if (ready) {
    return (
      <Link href={`/watch/${video.video_id}`} aria-label="Watch video">
        {inner}
      </Link>
    );
  }
  return inner;
}
