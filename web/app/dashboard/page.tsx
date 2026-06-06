"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  Download,
  FolderInput,
  FolderPlus,
  Globe,
  Home,
  LayoutGrid,
  Link2,
  List,
  Loader2,
  Lock,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Video as VideoIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { UploadDialog } from "@/components/upload-dialog";
import { VideoCard } from "@/components/video-card";
import { FolderCard } from "@/components/folder-card";
import { LimitsBanner } from "@/components/limits-banner";
import { Pagination } from "@/components/pagination";
import { ContextMenu, type MenuItem } from "@/components/context-menu";
import { Select } from "@/components/select";
import { MoveDialog } from "@/components/move-dialog";
import { NewFolderDialog } from "@/components/new-folder-dialog";
import { Modal } from "@/components/modal";
import { isInFlight } from "@/components/status-badge";
import { useAuth } from "@/lib/use-auth";
import { api, bulkDownloadUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { LIFETIME_VIDEO_LIMIT, MAX_FILE_BYTES, type Paginated, type Video } from "@/lib/types";

const COUNTED: Video["status"][] = ["uploaded", "transcoding", "transcoded"];
const PAGE_SIZE = 12;

function displayName(v: Video) {
  return v.original_filename || (v.s3_key.split("/").pop() ?? "video").replace(/^video-/, "");
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<Paginated<Video> | null>(null);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [folder, setFolder] = useState("");
  const [folders, setFolders] = useState<string[]>([]);
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const v = localStorage.getItem("vt_view");
    if (v === "grid" || v === "list") setView(v);
    const f = new URLSearchParams(window.location.search).get("folder");
    if (f) setFolder(f);
  }, []);
  // keep the current folder in the URL so a refresh stays in place
  useEffect(() => {
    const url = folder ? `${window.location.pathname}?folder=${encodeURIComponent(folder)}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [folder]);
  const changeView = (v: "grid" | "list") => {
    setView(v);
    localStorage.setItem("vt_view", v);
  };
  const [showUpload, setShowUpload] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // file-manager state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<{ x: number; y: number; video: Video } | null>(null);
  const [moveTarget, setMoveTarget] = useState<string[] | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Video | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [dl, setDl] = useState<{ phase: "preparing" | "downloading"; received: number; total: number; count: number } | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      try {
        // Root ("") shows uncategorized videos; otherwise the exact folder.
        // When searching, search across all folders.
        const folderParam = debouncedQ ? "" : folder === "" ? "uncategorized" : folder;
        setData(await api.videos(PAGE_SIZE, offset, { q: debouncedQ, folder: folderParam, sort }));
      } catch {
        /* keep previous */
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [offset, debouncedQ, folder, sort],
  );

  useEffect(() => {
    if (!authLoading && user) load();
  }, [authLoading, user, load]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => setOffset(0), [debouncedQ, folder, sort]);
  const refreshFolders = useCallback(() => api.folders().then(setFolders).catch(() => {}), []);
  useEffect(() => {
    if (!authLoading && user) refreshFolders();
  }, [authLoading, user, refreshFolders, data]);

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
  const selectionActive = selected.size > 0;
  const currentFolder = folder || undefined; // current path ("" = root)

  // Immediate child folders of the current path, derived from all folder paths.
  const subfolders = useMemo(() => {
    const prefix = folder ? folder + "/" : "";
    const names = new Set<string>();
    for (const p of folders) {
      if (!p.startsWith(prefix)) continue;
      const rest = p.slice(prefix.length);
      if (!rest) continue;
      names.add(rest.split("/")[0]);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [folders, folder]);

  const crumbs = folder ? folder.split("/") : [];
  const browsing = !debouncedQ; // folder navigation hidden while searching

  const openUpload = () => {
    if (atLimit) {
      toast.error(`You've reached the free limit of ${LIFETIME_VIDEO_LIMIT} videos.`, {
        description: "Contact hello@ayushsharma.me for higher limits.",
      });
      return;
    }
    setShowUpload(true);
  };

  const toggleSelect = (v: Video) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(v.video_id) ? next.delete(v.video_id) : next.add(v.video_id);
      return next;
    });
  const clearSelection = () => setSelected(new Set());
  const selectAll = () => setSelected(new Set((videos ?? []).map((v) => v.video_id)));

  const openVideo = (v: Video) => router.push(`/watch/${v.video_id}`);

  const toggleVisibility = async (v: Video) => {
    try {
      await api.setVisibility(v.video_id, !v.is_public);
      toast.success(!v.is_public ? "Now public" : "Now private");
      load(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't update visibility");
    }
  };

  const copyEmbed = (v: Video) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    navigator.clipboard.writeText(`${origin}/embed/${v.video_id}`);
    toast.success("Embed link copied");
  };

  const doRename = async () => {
    if (!renameTarget) return;
    const name = renameDraft.trim();
    if (!name) return toast.error("Name can't be empty");
    setRenaming(true);
    try {
      await api.renameVideo(renameTarget.video_id, name);
      toast.success("Renamed");
      setRenameTarget(null);
      load(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Rename failed");
    } finally {
      setRenaming(false);
    }
  };

  const bulkDownload = async (ids: string[]) => {
    if (ids.length === 0) return;
    setDl({ phase: "preparing", received: 0, total: 0, count: ids.length });
    try {
      const { token } = await api.bulkDownloadToken();
      // fetch resolves once headers arrive, i.e. after the server finishes remuxing.
      const res = await fetch(bulkDownloadUrl(ids, token));
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error?.message || "Download failed");
      }
      const total = Number(res.headers.get("X-Total-Bytes")) || 0;
      setDl({ phase: "downloading", received: 0, total, count: ids.length });
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        setDl({ phase: "downloading", received, total, count: ids.length });
      }
      const blob = new Blob(chunks as BlobPart[], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `videos_${ids.length}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Download ready");
      clearSelection();
    } catch (e: any) {
      toast.error(e?.message ?? "Download failed");
    } finally {
      setDl(null);
    }
  };

  const menuItems = useMemo<MenuItem[]>(() => {
    if (!menu) return [];
    const v = menu.video;
    const items: MenuItem[] = [];
    if (v.status === "transcoded") items.push({ label: "Open", icon: <Play className="h-4 w-4" />, onClick: () => openVideo(v) });
    items.push({ label: "Rename", icon: <Pencil className="h-4 w-4" />, onClick: () => { setRenameDraft(displayName(v)); setRenameTarget(v); } });
    items.push({ label: "Move to folder", icon: <FolderInput className="h-4 w-4" />, onClick: () => setMoveTarget([v.video_id]) });
    if (v.status === "transcoded")
      items.push({
        label: v.is_public ? "Make private" : "Make public",
        icon: v.is_public ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />,
        onClick: () => toggleVisibility(v),
      });
    if (v.is_public) items.push({ label: "Copy embed link", icon: <Link2 className="h-4 w-4" />, onClick: () => copyEmbed(v) });
    items.push({ separator: true });
    items.push({
      label: selected.has(v.video_id) ? "Deselect" : "Select",
      icon: <Check className="h-4 w-4" />,
      onClick: () => toggleSelect(v),
    });
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, selected]);

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

        {/* search + sort + folders */}
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full max-w-md items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search videos…"
                className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-accent/60"
              />
            </div>
            <Select
              ariaLabel="Sort"
              className="w-36 shrink-0"
              value={sort}
              onChange={setSort}
              options={[
                { label: "Newest", value: "newest" },
                { label: "Oldest", value: "oldest" },
                { label: "Name A→Z", value: "name" },
                { label: "Name Z→A", value: "name_desc" },
              ]}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start">
            <div className="flex items-center rounded-lg border border-border p-0.5">
              <button
                onClick={() => changeView("grid")}
                className={cn("rounded-md p-1.5 transition-colors", view === "grid" ? "bg-surface-2 text-ink" : "text-faint hover:text-ink")}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => changeView("list")}
                className={cn("rounded-md p-1.5 transition-colors", view === "list" ? "bg-surface-2 text-ink" : "text-faint hover:text-ink")}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => setNewFolderOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 font-mono text-[11px] text-muted transition-colors hover:border-accent/50 hover:text-accent"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              New folder
            </button>
          </div>
        </div>

        {/* breadcrumbs (folder navigation) */}
        {browsing && (
          <div className="mb-5 flex flex-wrap items-center gap-1 font-mono text-xs">
            <button
              onClick={() => setFolder("")}
              className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-surface", folder === "" ? "text-ink" : "text-muted hover:text-ink")}
            >
              <Home className="h-3.5 w-3.5" />
              Home
            </button>
            {crumbs.map((seg, i) => {
              const cp = crumbs.slice(0, i + 1).join("/");
              const last = i === crumbs.length - 1;
              return (
                <span key={cp} className="flex items-center">
                  <ChevronRight className="h-3.5 w-3.5 text-faint" />
                  <button
                    onClick={() => setFolder(cp)}
                    className={cn("max-w-[180px] truncate rounded-md px-2 py-1 transition-colors hover:bg-surface", last ? "text-ink" : "text-muted hover:text-ink")}
                  >
                    {seg}
                  </button>
                </span>
              );
            })}
          </div>
        )}

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
        ) : (browsing && subfolders.length > 0) || videos.length > 0 ? (
          <>
            {/* folders + videos share one grid so they align */}
            <div className={cn(view === "grid" ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-2")}>
              {browsing &&
                subfolders.map((name) => (
                  <FolderCard key={`f:${name}`} name={name} path={folder ? `${folder}/${name}` : name} view={view} onOpen={setFolder} />
                ))}
              {videos.map((v) => (
                <VideoCard
                  key={v.video_id}
                  video={v}
                  view={view}
                  selected={selected.has(v.video_id)}
                  selectionActive={selectionActive}
                  onOpen={openVideo}
                  onToggleSelect={toggleSelect}
                  onContextMenu={(e, vid) => {
                    e.preventDefault();
                    setMenu({ x: e.clientX, y: e.clientY, video: vid });
                  }}
                />
              ))}
            </div>
            {data && <Pagination total={data.total} limit={data.limit} offset={data.offset} onChange={setOffset} noun="videos" />}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
            <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface">
              <VideoIcon className="h-6 w-6 text-accent" strokeWidth={1.5} />
            </div>
            {debouncedQ ? (
              <>
                <h2 className="font-serif text-2xl text-ink">No matches</h2>
                <p className="mt-2 max-w-xs text-sm text-muted">No videos match your search.</p>
              </>
            ) : folder ? (
              <>
                <h2 className="font-serif text-2xl text-ink">Empty folder</h2>
                <p className="mt-2 max-w-xs text-sm text-muted">No videos here yet. Move some in, or upload.</p>
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
        )}
      </main>

      {/* selection toolbar */}
      {selectionActive && (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface/95 px-3 py-2 shadow-2xl backdrop-blur">
            <span className="px-2 font-mono text-xs text-ink">{selected.size} selected</span>
            <button onClick={selectAll} className="rounded-full px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:text-ink">
              Select page
            </button>
            <button
              onClick={() => bulkDownload([...selected])}
              disabled={!!dl}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-faint hover:text-ink disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
            <button onClick={() => setMoveTarget([...selected])} className="btn-primary px-4 py-1.5 text-xs">
              <FolderInput className="h-3.5 w-3.5" />
              Move to folder
            </button>
            <button onClick={clearSelection} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:text-ink">
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
        </div>
      )}

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}

      {moveTarget && (
        <MoveDialog
          videoIds={moveTarget}
          folders={folders}
          currentFolder={currentFolder}
          onClose={() => setMoveTarget(null)}
          onMoved={() => {
            setMoveTarget(null);
            clearSelection();
            load(true);
            refreshFolders();
          }}
        />
      )}

      {newFolderOpen && (
        <NewFolderDialog
          parent={currentFolder}
          onClose={() => setNewFolderOpen(false)}
          onCreated={(path) => {
            setNewFolderOpen(false);
            refreshFolders();
            setFolder(path);
          }}
        />
      )}

      {renameTarget && (
        <Modal open onClose={renaming ? () => {} : () => setRenameTarget(null)} className="max-w-sm">
          <h2 className="mb-4 font-serif text-xl text-ink">Rename video</h2>
          <input
            autoFocus
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doRename()}
            className="field-input"
          />
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setRenameTarget(null)} disabled={renaming} className="btn-ghost px-4 py-2.5">
              Cancel
            </button>
            <button onClick={doRename} disabled={renaming} className="btn-primary px-5 py-2.5">
              {renaming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </button>
          </div>
        </Modal>
      )}

      {showUpload && (
        <UploadDialog
          onClose={() => setShowUpload(false)}
          onUploaded={() => load(true)}
          maxBytes={unlimited ? 50 * 1024 * 1024 * 1024 : MAX_FILE_BYTES}
        />
      )}

      {dl && (
        <Modal open onClose={() => {}} className="max-w-xs">
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-accent" />
            {dl.phase === "preparing" ? (
              <>
                <p className="text-sm text-ink">
                  Preparing {dl.count} {dl.count === 1 ? "video" : "videos"}…
                </p>
                <p className="font-mono text-xs text-muted">Transcoding to MP4 and zipping</p>
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div className="absolute inset-y-0 w-1/3 rounded-full bg-accent" style={{ animation: "kdlbar 1.1s ease-in-out infinite" }} />
                  <style>{`@keyframes kdlbar{0%{left:-35%}100%{left:100%}}`}</style>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-ink">Downloading…</p>
                <p className="font-mono text-xs text-muted">
                  {(dl.received / 1048576).toFixed(1)}
                  {dl.total ? ` / ${(dl.total / 1048576).toFixed(1)}` : ""} MB
                </p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-150"
                    style={{ width: dl.total ? `${Math.min(100, Math.round((dl.received / dl.total) * 100))}%` : "100%" }}
                  />
                </div>
              </>
            )}
            <p className="font-mono text-[10px] text-faint">Keep this tab open until it finishes.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
