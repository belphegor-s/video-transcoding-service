"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({ open, onClose, children, className }: { open: boolean; onClose: () => void; children: React.ReactNode; className?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative z-10 w-full max-w-md animate-rise rounded-2xl border border-border bg-surface p-6 shadow-2xl", className)}>
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={loading ? () => {} : onClose}>
      <h2 className="font-serif text-2xl text-ink">{title}</h2>
      {description && <div className="mt-2 text-sm leading-relaxed text-muted">{description}</div>}
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} disabled={loading} className="btn-ghost px-4 py-2.5">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            "btn inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm transition-all active:scale-[0.98] disabled:opacity-50",
            destructive ? "bg-danger text-bg hover:brightness-110" : "bg-accent text-accent-ink hover:brightness-110",
          )}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
