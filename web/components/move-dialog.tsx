"use client";

import { useState } from "react";
import { Check, Folder, FolderInput, FolderPlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "./modal";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function MoveDialog({
  videoIds,
  folders,
  currentFolder,
  onClose,
  onMoved,
}: {
  videoIds: string[];
  folders: string[];
  currentFolder?: string;
  onClose: () => void;
  onMoved: (folder: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [nest, setNest] = useState(!!currentFolder);

  const move = async (folder: string | null) => {
    setBusy(true);
    try {
      await api.moveVideos(videoIds, folder);
      onMoved(folder);
      toast.success(folder ? `Moved to "${folder}"` : "Moved out of folder");
    } catch (e: any) {
      toast.error(e?.message ?? "Move failed");
    } finally {
      setBusy(false);
    }
  };

  const createAndMove = async () => {
    const base = name.trim();
    if (!base) {
      toast.error("Enter a folder name");
      return;
    }
    const path = nest && currentFolder ? `${currentFolder}/${base}` : base;
    setBusy(true);
    try {
      await api.createFolder(path);
      await api.moveVideos(videoIds, path);
      onMoved(path);
      toast.success(`Moved to "${path}"`);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't create folder");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={busy ? () => {} : onClose} className="max-w-sm">
      <div className="mb-4 flex items-center gap-2">
        <FolderInput className="h-4 w-4 text-accent" />
        <h2 className="font-serif text-xl text-ink">
          Move {videoIds.length} {videoIds.length === 1 ? "video" : "videos"}
        </h2>
      </div>

      <div className="max-h-56 space-y-1 overflow-y-auto">
        <button
          onClick={() => move(null)}
          disabled={busy}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
          No folder (uncategorized)
        </button>
        {folders.map((f) => (
          <button
            key={f}
            onClick={() => move(f)}
            disabled={busy}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            <Folder className="h-3.5 w-3.5 text-accent" />
            <span className="truncate">{f}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        {creating ? (
          <div className="space-y-2">
            {currentFolder && (
              <button
                onClick={() => setNest((n) => !n)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] transition-colors",
                  nest ? "border-accent/50 bg-accent/10 text-accent" : "border-border text-muted hover:text-ink",
                )}
              >
                {nest && <Check className="h-3 w-3" />}
                Nest inside &quot;{currentFolder}&quot;
              </button>
            )}
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createAndMove()}
                placeholder="New folder name (use / to nest)"
                className="field-input"
              />
              <button onClick={createAndMove} disabled={busy} className="btn-primary shrink-0 px-3 py-2.5">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </button>
            </div>
            {nest && currentFolder && name.trim() && (
              <p className="font-mono text-[10px] text-faint">Creates: {currentFolder}/{name.trim()}</p>
            )}
          </div>
        ) : (
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 text-sm text-accent transition-colors hover:brightness-110">
            <FolderPlus className="h-4 w-4" />
            New folder
          </button>
        )}
      </div>
    </Modal>
  );
}
