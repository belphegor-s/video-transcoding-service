"use client";

import { useState } from "react";
import { Check, FolderPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "./modal";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function NewFolderDialog({
  parent,
  onClose,
  onCreated,
}: {
  parent?: string;
  onClose: () => void;
  onCreated: (path: string) => void;
}) {
  const [name, setName] = useState("");
  const [nest, setNest] = useState(!!parent);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    const base = name.trim();
    if (!base) {
      toast.error("Enter a folder name");
      return;
    }
    const path = nest && parent ? `${parent}/${base}` : base;
    setBusy(true);
    try {
      const res = await api.createFolder(path);
      onCreated(res.path);
      toast.success(`Folder "${res.path}" created`);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't create folder");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={busy ? () => {} : onClose} className="max-w-sm">
      <div className="mb-4 flex items-center gap-2">
        <FolderPlus className="h-4 w-4 text-accent" />
        <h2 className="font-serif text-xl text-ink">New folder</h2>
      </div>

      {parent && (
        <button
          onClick={() => setNest((n) => !n)}
          className={cn(
            "mb-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] transition-colors",
            nest ? "border-accent/50 bg-accent/10 text-accent" : "border-border text-muted hover:text-ink",
          )}
        >
          {nest && <Check className="h-3 w-3" />}
          Nest inside &quot;{parent}&quot;
        </button>
      )}

      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Folder name (use / to nest)"
          className="field-input"
        />
        <button onClick={create} disabled={busy} className="btn-primary shrink-0 px-4 py-2.5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
        </button>
      </div>
      <p className="mt-2 font-mono text-[10px] text-faint">
        {nest && parent && name.trim() ? `Creates: ${parent}/${name.trim()}` : "Tip: use / to create nested folders, e.g. Marketing/Q1"}
      </p>
    </Modal>
  );
}
