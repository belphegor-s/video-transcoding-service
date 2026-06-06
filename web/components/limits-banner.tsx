import { ArrowUpRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function LimitsBanner({ used, limit }: { used: number; limit: number }) {
  const atLimit = used >= limit;
  const pct = Math.min(100, Math.round((used / limit) * 100));

  return (
    <div className={cn("card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between", atLimit && "border-accent/40")}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-2">
          <Info className="h-4 w-4 text-accent" />
        </div>
        <div>
          <p className="text-sm text-ink">
            Free plan · <span className="font-mono">{used}/{limit}</span> videos · 1&nbsp;GB per file
          </p>
          <p className="mt-1 max-w-md text-xs text-muted">
            {atLimit
              ? "You've reached the free limit. Reach out to lift it or run this on your own infrastructure."
              : "Need higher limits or an on-prem deployment? Let's talk."}
          </p>
          <div className="mt-2.5 h-1.5 w-44 overflow-hidden rounded-full bg-surface-2">
            <div className={cn("h-full rounded-full transition-all", atLimit ? "bg-accent" : "bg-faint")} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <a
        href="mailto:hello@ayushsharma.me?subject=Video%20Transcoder%3A%20higher%20limits"
        className="btn-ghost shrink-0 px-4 py-2.5"
      >
        Contact admin
        <ArrowUpRight className="h-4 w-4" />
      </a>
    </div>
  );
}
