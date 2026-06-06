"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Plus, RefreshCw, Search, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { UploadDialog } from "@/components/upload-dialog";
import { VideoCard } from "@/components/video-card";
import { LimitsBanner } from "@/components/limits-banner";
import { Pagination } from "@/components/pagination";
import { isInFlight } from "@/components/status-badge";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { LIFETIME_VIDEO_LIMIT, MAX_FILE_BYTES, type Paginated, type Video } from "@/lib/types";

const COUNTED: Video["status"][] = ["uploaded", "transcoding", "transcoded"];
const PAGE_SIZE = 12;

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<Paginated<Video> | null>(null);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [folder, setFolder] = useState(""); // "" all, "uncategorized", or a name
  const [folders, setFolders] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      try {
        setData(await api.videos(PAGE_SIZE, offset, { q: debouncedQ, folder }));
      } catch {
        // keep previous state on transient errors
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [offset, debouncedQ, folder],
  );

  useEffect(() => {
    if (!authLoading && user) load();
  }, [authLoading, user, load]);

  // debounce search; reset to first page on query/folder change
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => setOffset(0), [debouncedQ, folder]);

  // keep folder chips fresh
  useEffect(() => {
    if (!authLoading && user) api.folders().then(setFolders).catch(() => {});
  }, [authLoading, user, data]);

  // poll while any video on this page is still processing
  useEffect(() => {
    const anyInFlight = data?.items.some((v) => isInFlight(v.status));
    if (pollRef.current) clearInterval(pollRef.current);
    if (anyInFlight) pollRef.current = setInterval(() => load(true), 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [data, load]);

  const videos = data?.items ?? null;
  const usedCount = videos?.filter((v) => COUNTED.includes(v.status)).length ?? 0;
  const unlimited = !!user?.unlimited;
  const atLimit = !unlimited && usedCount >= LIFETIME_VIDEO_LIMIT;

  const openUpload = () => {
    if (atLimit) {
      toast.error(`You've reached the free limit of ${LIFETIME_VIDEO_LIMIT} videos.`, {
        description: "Contact hello@ayushsharma.me for higher limits.",
      });
      return;
    }
    setShowUpload(true);
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen">
      <AppHeader user={user} />

      <main className="shell py-10 sm:py-14">
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow mb-3">Your library</p>
            <h1 className="font-serif text-4xl text-ink sm:text-5xl">Videos</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load()}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 font-mono text-xs text-muted transition-colors hover:border-faint hover:text-ink"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button onClick={openUpload} className="btn-primary px-5 py-2.5">
              <Plus className="h-4 w-4" />
              Upload
            </button>
          </div>
        </div>

        {/* search + folders */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search videos…"
              className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-accent/60"
            />
          </div>
          {folders.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {["", ...folders, "uncategorized"].map((f) => (
                <button
                  key={f || "all"}
                  onClick={() => setFolder(f)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 font-mono text-[11px] transition-colors",
                    folder === f ? "border-accent/50 bg-accent/10 text-accent" : "border-border text-muted hover:text-ink",
                  )}
                >
                  {f === "" ? "All" : f === "uncategorized" ? "Uncategorized" : f}
                </button>
              ))}
            </div>
          )}
        </div>

        {videos !== null && videos.length > 0 && !unlimited && (
          <div className="mb-8">
            <LimitsBanner used={usedCount} limit={LIFETIME_VIDEO_LIMIT} />
          </div>
        )}

        {videos === null ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl border border-border bg-surface" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
            <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface">
              <VideoIcon className="h-6 w-6 text-accent" strokeWidth={1.5} />
            </div>
            {debouncedQ || folder ? (
              <>
                <h2 className="font-serif text-2xl text-ink">No matches</h2>
                <p className="mt-2 max-w-xs text-sm text-muted">No videos match your search or folder filter.</p>
              </>
            ) : (
              <>
                <h2 className="font-serif text-2xl text-ink">No videos yet</h2>
                <p className="mt-2 max-w-xs text-sm text-muted">
                  Upload your first source file and watch it become an adaptive stream.
                </p>
                <button onClick={openUpload} className="btn-primary mt-7 px-6 py-3">
                  <Plus className="h-4 w-4" />
                  Upload a video
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((v) => (
                <VideoCard key={v.video_id} video={v} />
              ))}
            </div>
            {data && <Pagination total={data.total} limit={data.limit} offset={data.offset} onChange={setOffset} noun="videos" />}
          </>
        )}
      </main>

      {showUpload && (
        <UploadDialog
          onClose={() => setShowUpload(false)}
          onUploaded={() => load(true)}
          maxBytes={unlimited ? 50 * 1024 * 1024 * 1024 : MAX_FILE_BYTES}
        />
      )}
    </div>
  );
}
