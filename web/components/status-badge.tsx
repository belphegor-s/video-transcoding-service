import { cn } from "@/lib/utils";
import type { VideoStatus } from "@/lib/types";

const MAP: Record<VideoStatus, { label: string; dot: string; text: string; pulse?: boolean }> = {
  signed_url_generated: { label: "Awaiting upload", dot: "bg-faint", text: "text-muted" },
  uploaded: { label: "Queued", dot: "bg-accent", text: "text-ink", pulse: true },
  transcoding: { label: "Transcoding", dot: "bg-accent", text: "text-accent", pulse: true },
  transcoded: { label: "Ready", dot: "bg-ok", text: "text-ok" },
  error: { label: "Failed", dot: "bg-danger", text: "text-danger" },
};

export function StatusBadge({ status }: { status: VideoStatus }) {
  const s = MAP[status] ?? MAP.signed_url_generated;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-surface-2 px-3 py-1 font-mono text-[11px] uppercase tracking-label",
        s.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot, s.pulse && "animate-pulse-soft")} />
      {s.label}
    </span>
  );
}

export function isInFlight(status: VideoStatus) {
  return status === "signed_url_generated" || status === "uploaded" || status === "transcoding";
}
