"use client";

import { useEffect, useState } from "react";
import { Clapperboard, Play } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Lazily loads (and triggers server-side generation of) a video's thumbnail. */
export function VideoThumb({ videoId, ready, showPlay = false }: { videoId: string; ready: boolean; showPlay?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    api
      .thumbnail(videoId)
      .then((r) => active && setUrl(r.url))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [videoId, ready]);

  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-2">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {url && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-contain"
        />
      ) : (
        <Clapperboard className={cn("relative h-8 w-8 text-faint", ready && !failed && "animate-pulse")} strokeWidth={1.5} />
      )}

      {showPlay && ready && (
        <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-ink shadow-lg transition-transform duration-300 group-hover:scale-110">
          <Play className="h-5 w-5 translate-x-px fill-current" />
        </span>
      )}
    </div>
  );
}
