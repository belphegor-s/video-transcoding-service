"use client";

import { useState } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export function EditableTitle({
  videoId,
  value,
  onSaved,
}: {
  videoId: string;
  value: string;
  onSaved: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const name = draft.trim();
    if (!name) {
      toast.error("Name can't be empty");
      return;
    }
    if (name === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await api.renameVideo(videoId, name);
      onSaved(name);
      setEditing(false);
      toast.success("Renamed");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't rename");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setDraft(value);
              setEditing(false);
            }
          }}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-lg text-ink outline-none focus:border-accent/60"
        />
        <button onClick={save} disabled={saving} className="shrink-0 rounded-md border border-border p-1.5 text-ok transition-colors hover:bg-surface" aria-label="Save">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </button>
        <button
          onClick={() => {
            setDraft(value);
            setEditing(false);
          }}
          disabled={saving}
          className="shrink-0 rounded-md border border-border p-1.5 text-faint transition-colors hover:bg-surface hover:text-ink"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2">
      <h1 className="truncate text-lg text-ink" title={value}>
        {value}
      </h1>
      <button
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className="shrink-0 text-faint opacity-100 transition-opacity hover:text-ink focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        aria-label="Rename"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
