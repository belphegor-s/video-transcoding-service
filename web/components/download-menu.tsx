"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { api, downloadAllUrl, downloadQualityUrl } from "@/lib/api";

export function DownloadMenu({ videoId, qualities }: { videoId: string; qualities: string[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const triggerDownload = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const start = async (quality?: string) => {
    setBusy(true);
    try {
      const { token } = await api.downloadToken(videoId);
      triggerDownload(quality ? downloadQualityUrl(videoId, quality, token) : downloadAllUrl(videoId, token));
      toast.info(quality ? `Preparing ${quality} MP4…` : "Preparing a zip of all qualities…", {
        description: "We remux on the fly, so the download starts in a few seconds.",
      });
      setOpen(false);
    } catch {
      toast.error("Couldn't start the download. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} disabled={busy} className="btn-ghost px-4 py-2.5">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Download
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-60 animate-rise overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
          <div className="border-b border-border px-4 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-label text-faint">Single quality (MP4)</p>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {qualities.map((q) => (
              <li key={q}>
                <button
                  onClick={() => start(q)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-ink transition-colors hover:bg-surface-2"
                >
                  <span>{q}</span>
                  <Download className="h-3.5 w-3.5 text-faint" />
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={() => start()}
            className="flex w-full items-center gap-2 border-t border-border px-4 py-3 text-sm text-accent transition-colors hover:bg-surface-2"
          >
            <Package className="h-4 w-4" />
            All qualities (.zip)
          </button>
        </div>
      )}
    </div>
  );
}
