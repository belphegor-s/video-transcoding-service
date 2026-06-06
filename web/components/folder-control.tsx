"use client";

import { useEffect, useId, useState } from "react";
import { Check, Folder, FolderPlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export function FolderControl({
  videoId,
  value,
  onSaved,
}: {
  videoId: string;
  value: string | null;
  onSaved: (folder: string | null) => void;
}) {
  const listId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [folders, setFolders] = useState<string[]>([]);

  useEffect(() => {
    if (editing) api.folders().then(setFolders).catch(() => {});
  }, [editing]);

  const save = async (next: string | null) => {
    setSaving(true);
    try {
      const folder = next && next.trim() ? next.trim() : null;
      await api.setFolder(videoId, folder);
      onSaved(folder);
      setEditing(false);
      toast.success(folder ? `Moved to "${folder}"` : "Removed from folder");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't update folder");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          list={listId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save(draft);
            if (e.key === "Escape") {
              setDraft(value ?? "");
              setEditing(false);
            }
          }}
          placeholder="Folder name"
          className="w-40 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/60"
        />
        <datalist id={listId}>
          {folders.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
        <button onClick={() => save(draft)} disabled={saving} className="shrink-0 rounded-md border border-border p-1.5 text-ok hover:bg-surface" aria-label="Save folder">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </button>
        <button
          onClick={() => {
            setDraft(value ?? "");
            setEditing(false);
          }}
          disabled={saving}
          className="shrink-0 rounded-md border border-border p-1.5 text-faint hover:bg-surface hover:text-ink"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(value ?? "");
        setEditing(true);
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-mono text-[11px] text-muted transition-colors hover:border-faint hover:text-ink"
    >
      {value ? <Folder className="h-3.5 w-3.5 text-accent" /> : <FolderPlus className="h-3.5 w-3.5" />}
      {value || "Add to folder"}
    </button>
  );
}
