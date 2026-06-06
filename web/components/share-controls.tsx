"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Globe, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ShareControls({ videoId, initialPublic }: { videoId: string; initialPublic: boolean }) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://transcode.pixly.sh";
  const embedUrl = `${origin}/embed/${videoId}`;
  const embedCode = `<iframe src="${embedUrl}" width="640" height="360" style="border:0;border-radius:12px" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;

  const toggle = async () => {
    setSaving(true);
    const next = !isPublic;
    try {
      await api.setVisibility(videoId, next);
      setIsPublic(next);
      toast.success(next ? "Video is now public, embedding enabled" : "Video is now private");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't update visibility");
    } finally {
      setSaving(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success("Embed code copied");
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", isPublic ? "border-accent/40 bg-accent/10" : "border-border bg-surface-2")}>
            {isPublic ? <Globe className="h-4 w-4 text-accent" /> : <Lock className="h-4 w-4 text-faint" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-ink">{isPublic ? "Public" : "Private"}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              {isPublic ? "Anyone with the link can watch and embed this video." : "Only you can watch this video."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-faint" />}
          <button
            role="switch"
            aria-checked={isPublic}
            onClick={toggle}
            disabled={saving}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
              isPublic ? "bg-accent" : "border border-border bg-surface-2",
            )}
          >
            <span className={cn("inline-block h-4 w-4 transform rounded-full bg-bg transition-transform", isPublic ? "translate-x-6" : "translate-x-1")} />
          </button>
        </div>
      </div>

      {isPublic && (
        <div className="space-y-3 border-t border-border px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-label text-faint">Embed code</p>
            <div className="flex items-center gap-3">
              <a href={embedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-muted transition-colors hover:text-ink">
                Open <ExternalLink className="h-3 w-3" />
              </a>
              <button onClick={copy} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 font-mono text-[10px] text-muted transition-colors hover:text-ink">
                {copied ? <Check className="h-3 w-3 text-ok" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-bg p-3">
            <code className="block whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-muted">{embedCode}</code>
          </div>

          <p className="truncate font-mono text-[11px] text-faint">
            Link:{" "}
            <a href={embedUrl} target="_blank" rel="noreferrer" className="text-muted hover:text-ink">
              {embedUrl}
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
