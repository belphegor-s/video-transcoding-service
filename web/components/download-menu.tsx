"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Download, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { api, downloadAllUrl, downloadQualityUrl } from "@/lib/api";
import { useAnchoredMenu } from "@/lib/use-anchored-menu";
import type { Quality } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL = "__all__";

export function DownloadMenu({ videoId, qualities }: { videoId: string; qualities: Quality[] }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);

  const anchorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pos = useAnchoredMenu({ open, anchorRef, menuRef, align: "end" });

  // Portals need the DOM, and this page is client-rendered under Next's app router.
  useEffect(() => setMounted(true), []);

  const close = useCallback(() => {
    setOpen(false);
    anchorRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !anchorRef.current?.contains(target)) setOpen(false);
    };
    // Escape has to work once focus has moved onto a row inside the portal.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const triggerDownload = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const start = async (quality?: string) => {
    const key = quality ?? ALL;
    setPending(key);
    try {
      const { token } = await api.downloadToken(videoId);
      triggerDownload(quality ? downloadQualityUrl(videoId, quality, token) : downloadAllUrl(videoId, token));
      toast.info(quality ? `Preparing ${quality} MP4…` : "Preparing a zip of all qualities…", {
        description: "We remux on the fly, so the download starts in a few seconds.",
      });
      setDone(key);
      setTimeout(() => setDone((d) => (d === key ? null : d)), 2000);
      close();
    } catch {
      toast.error("Couldn't start the download. Try again.");
    } finally {
      setPending(null);
    }
  };

  // Roving focus across the quality rows plus the trailing "all qualities" row.
  const rowCount = qualities.length + 1;
  const choose = (i: number) => (i < qualities.length ? start(qualities[i].label) : start());

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setActive(0);
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => (a + 1) % rowCount);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => (a - 1 + rowCount) % rowCount);
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(rowCount - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
    }
  };

  const busy = pending !== null;

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Download options"
      style={{
        top: pos.top,
        left: pos.left,
        maxHeight: pos.maxHeight || undefined,
        maxWidth: pos.maxWidth || undefined,
      }}
      className={cn(
        "fixed z-50 flex w-64 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl",
        "animate-pop motion-reduce:animate-none",
        pos.placement === "bottom" ? "origin-top" : "origin-bottom",
        // Stay invisible for the first frame, before we know where it goes.
        !pos.ready && "pointer-events-none opacity-0",
      )}
    >
      <div className="shrink-0 border-b border-border px-4 py-2.5">
        <p className="font-mono text-[10px] uppercase tracking-label text-faint">Single quality (MP4)</p>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto py-1">
        {qualities.map((q, i) => {
          const key = q.label;
          return (
            <li key={key}>
              <button
                role="menuitem"
                disabled={busy}
                onClick={() => start(key)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  i === active ? "bg-surface-2" : "hover:bg-surface-2",
                )}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm text-ink">
                    {q.label}
                    {i === 0 && (
                      <span className="rounded-full border border-accent/30 bg-accent/10 px-1.5 py-px font-mono text-[9px] uppercase tracking-label text-accent">
                        Best
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10px] text-faint">
                    {q.width} &times; {q.height}
                  </span>
                </span>
                <RowIcon pending={pending === key} done={done === key} />
              </button>
            </li>
          );
        })}
      </ul>

      <button
        role="menuitem"
        disabled={busy}
        onClick={() => start()}
        onMouseEnter={() => setActive(qualities.length)}
        className={cn(
          "flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          active === qualities.length ? "bg-surface-2" : "hover:bg-surface-2",
        )}
      >
        <span className="flex items-center gap-2 text-sm text-accent">
          <Package className="h-4 w-4 shrink-0" />
          All qualities (.zip)
        </span>
        <RowIcon pending={pending === ALL} done={done === ALL} />
      </button>
    </div>
  );

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className="btn-ghost px-4 py-2.5"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Download
        <ChevronDown className={cn("h-3.5 w-3.5 text-faint transition-transform", open && "rotate-180")} />
      </button>

      {mounted && open && createPortal(menu, document.body)}
    </>
  );
}

function RowIcon({ pending, done }: { pending: boolean; done: boolean }) {
  if (pending) return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent" />;
  if (done) return <Check className="h-3.5 w-3.5 shrink-0 text-ok" />;
  return <Download className="h-3.5 w-3.5 shrink-0 text-faint" />;
}
