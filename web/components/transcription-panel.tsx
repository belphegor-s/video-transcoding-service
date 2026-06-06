"use client";

import { useEffect, useState } from "react";
import { Copy, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Transcription } from "@/lib/types";

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function TranscriptionPanel({ fetcher }: { fetcher: () => Promise<Transcription> }) {
  const [data, setData] = useState<Transcription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetcher()
      .then((t) => active && setData(t))
      .catch(() => active && setData({ available: false }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyAll = () => {
    if (!data?.cues) return;
    navigator.clipboard.writeText(data.cues.map((c) => c.text).join(" "));
    toast.success("Transcript copied");
  };

  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-accent" />
          <h3 className="font-mono text-xs uppercase tracking-label text-muted">Transcription</h3>
          {data?.language && (
            <span className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] uppercase text-faint">
              {data.language}
            </span>
          )}
        </div>
        {data?.available && (
          <button onClick={copyAll} className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted transition-colors hover:text-ink">
            <Copy className="h-3.5 w-3.5" />
            Copy
          </button>
        )}
      </div>

      <div className="min-h-[200px] flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        ) : data?.available && data.cues?.length ? (
          <ol className="space-y-3">
            {data.cues.map((cue, i) => (
              <li key={i} className="group flex gap-3">
                <span className="shrink-0 font-mono text-[11px] text-faint tabular-nums pt-0.5">{fmt(cue.start)}</span>
                <p className="text-sm leading-relaxed text-muted transition-colors group-hover:text-ink">{cue.text}</p>
              </li>
            ))}
          </ol>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
            <FileText className="h-7 w-7 text-faint" strokeWidth={1.5} />
            <p className="text-sm text-muted">No transcription available</p>
            <p className="max-w-xs font-mono text-[11px] text-faint">
              No speech was detected in this video, or captions could not be generated.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
