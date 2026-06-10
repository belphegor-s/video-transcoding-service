"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { RenditionProgress as RP } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Live, per-rendition transcoding progress for an in-flight video. Polls the
 * worker-published Redis state and renders one bar per resolution (plus
 * captions). Stops polling once the video reaches a terminal status.
 */
export function RenditionProgress({ videoId, onDone }: { videoId: string; onDone?: () => void }) {
  const [rows, setRows] = useState<RP[]>([]);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      try {
        const { status, renditions } = await api.renditionProgress(videoId);
        if (cancelled) return;
        setRows(renditions);
        if (status === "transcoded" || status === "error") {
          if (timer) clearInterval(timer);
          doneRef.current?.();
        }
      } catch {
        /* keep last */
      }
    };

    tick();
    timer = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [videoId]);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
      {rows.map((r) => {
        const isCaptions = r.label === "captions";
        const name = isCaptions ? "Captions" : `${r.p ?? Math.min(r.width ?? 0, r.height ?? 0)}p`;
        const done = r.status === "done" || r.status === "skipped";
        const pct = done ? 100 : Math.max(0, Math.min(100, r.percent || 0));
        return (
          <div key={r.label} className="flex items-center gap-2">
            <span className="w-12 shrink-0 font-mono text-[10px] text-muted">{name}</span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className={cn("h-full rounded-full transition-all duration-300", done ? "bg-ok" : "bg-accent")}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="flex w-8 shrink-0 items-center justify-end font-mono text-[10px] text-faint">
              {done ? (
                r.status === "skipped" ? "—" : <Check className="h-3 w-3 text-ok" />
              ) : r.status === "processing" ? (
                `${pct}%`
              ) : (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
