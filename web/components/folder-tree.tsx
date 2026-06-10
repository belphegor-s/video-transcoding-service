"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Folder, FolderOpen, FolderPlus, Home, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Node {
  name: string;
  path: string;
  children: Node[];
}

function buildTree(paths: string[]): Node[] {
  const root: Node[] = [];
  for (const p of [...paths].sort((a, b) => a.localeCompare(b))) {
    const segs = p.split("/").filter(Boolean);
    let level = root;
    let cur = "";
    for (const s of segs) {
      cur = cur ? `${cur}/${s}` : s;
      let node = level.find((n) => n.name === s);
      if (!node) {
        node = { name: s, path: cur, children: [] };
        level.push(node);
      }
      level = node.children;
    }
  }
  return root;
}

/**
 * Expandable folder tree picker. Click a folder to select it (the highlighted
 * row is where the upload lands); expand/collapse with the chevron. A "New
 * folder" row creates a child of the current selection inline.
 */
export function FolderTree({
  folders,
  value,
  onChange,
  onCreate,
}: {
  folders: string[];
  value: string;
  onChange: (path: string) => void;
  onCreate: (path: string) => Promise<void>;
}) {
  const tree = useMemo(() => buildTree(folders), [folders]);
  // expand every ancestor of the current selection by default
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (value) {
      const segs = value.split("/");
      let cur = "";
      for (const seg of segs) {
        cur = cur ? `${cur}/${seg}` : seg;
        s.add(cur);
      }
    }
    return s;
  });
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (path: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });

  const submitCreate = async () => {
    const name = draft.trim().replace(/\//g, "-");
    if (!name) return;
    const path = value ? `${value}/${name}` : name;
    setBusy(true);
    try {
      await onCreate(path);
      // reveal + select the new folder
      setExpanded((prev) => {
        const next = new Set(prev);
        const segs = path.split("/");
        let cur = "";
        for (const seg of segs) {
          cur = cur ? `${cur}/${seg}` : seg;
          next.add(cur);
        }
        return next;
      });
      onChange(path);
      setDraft("");
      setCreating(false);
    } finally {
      setBusy(false);
    }
  };

  const renderNodes = (nodes: Node[], depth: number) =>
    nodes.map((node) => {
      const isOpen = expanded.has(node.path);
      const isSelected = value === node.path;
      const hasChildren = node.children.length > 0;
      return (
        <div key={node.path}>
          <div
            className={cn(
              "group flex items-center gap-1 rounded-lg pr-2 transition-colors",
              isSelected ? "bg-accent/10 text-accent" : "text-ink hover:bg-surface-2",
            )}
            style={{ paddingLeft: `${depth * 14 + 4}px` }}
          >
            <button
              type="button"
              onClick={() => hasChildren && toggle(node.path)}
              className={cn("flex h-6 w-5 shrink-0 items-center justify-center text-faint", !hasChildren && "invisible")}
              aria-label={isOpen ? "Collapse" : "Expand"}
            >
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-90")} />
            </button>
            <button
              type="button"
              onClick={() => onChange(node.path)}
              className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-sm"
            >
              {isOpen && hasChildren ? (
                <FolderOpen className="h-4 w-4 shrink-0 text-accent" />
              ) : (
                <Folder className="h-4 w-4 shrink-0 text-faint" />
              )}
              <span className="truncate">{node.name}</span>
            </button>
          </div>
          {isOpen && hasChildren && renderNodes(node.children, depth + 1)}
        </div>
      );
    });

  return (
    <div className="rounded-xl border border-border bg-surface-2/40">
      <div className="max-h-52 overflow-y-auto p-1.5">
        {/* uncategorized / root */}
        <button
          type="button"
          onClick={() => onChange("")}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
            value === "" ? "bg-accent/10 text-accent" : "text-ink hover:bg-surface-2",
          )}
        >
          <Home className="h-4 w-4 shrink-0 text-faint" />
          Root
        </button>

        {tree.length > 0 && <div className="mt-1">{renderNodes(tree, 0)}</div>}
      </div>

      <div className="border-t border-border p-1.5">
        {creating ? (
          <div className="flex items-center gap-1.5 px-1">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitCreate();
                }
                if (e.key === "Escape") {
                  setCreating(false);
                  setDraft("");
                }
              }}
              placeholder={value ? `New folder in "${value.split("/").pop()}"` : "New folder name"}
              className="field-input h-8 flex-1 text-sm"
            />
            <button type="button" onClick={submitCreate} disabled={busy || !draft.trim()} className="btn-primary h-8 px-3 text-xs">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left font-mono text-[11px] text-muted transition-colors hover:text-accent"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            New folder{value ? ` in "${value.split("/").pop()}"` : ""}
          </button>
        )}
      </div>
    </div>
  );
}
